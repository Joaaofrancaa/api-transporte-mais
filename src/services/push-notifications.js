const webPush = require("web-push");

const env = require("../config/env");
const { getDatabasePool } = require("../database/connection");

const recipientProfiles = ["MOTORISTA"];
const notificationIntervalMs = 30 * 1000;
let transportRequestNotificationTimer = null;
let isProcessingTransportRequestNotifications = false;

function getRequestScheduledDate(request) {
  const scheduledAt = request?.agendado_para;

  if (!scheduledAt) {
    return null;
  }

  if (scheduledAt instanceof Date) {
    return scheduledAt;
  }

  const normalizedDateTime = String(scheduledAt).replace(" ", "T").slice(0, 16);
  const date = new Date(normalizedDateTime);

  return Number.isNaN(date.getTime()) ? null : date;
}

function isRequestDueForNotification(request) {
  const scheduledDate = getRequestScheduledDate(request);

  return !scheduledDate || scheduledDate.getTime() <= Date.now();
}

function isPushConfigured() {
  return Boolean(env.push.publicKey && env.push.privateKey);
}

function configureWebPush() {
  if (!isPushConfigured()) {
    return false;
  }

  webPush.setVapidDetails(
    env.push.subject,
    env.push.publicKey,
    env.push.privateKey,
  );

  return true;
}

async function saveSubscription(user, subscription, userAgent = "") {
  if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    return false;
  }

  const pool = getDatabasePool();
  await pool.execute("UPDATE push_subscriptions SET ativo = FALSE WHERE endpoint = ?", [
    subscription.endpoint,
  ]);

  if (!recipientProfiles.includes(user.perfil)) {
    return true;
  }

  await pool.execute(
    `INSERT INTO push_subscriptions
      (instituicao_id, usuario_id, perfil, endpoint, p256dh, auth, user_agent, ativo)
     VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)
     ON DUPLICATE KEY UPDATE
      instituicao_id = VALUES(instituicao_id),
      perfil = VALUES(perfil),
      p256dh = VALUES(p256dh),
      auth = VALUES(auth),
      user_agent = VALUES(user_agent),
      ativo = TRUE`,
    [
      user.instituicao_id,
      user.id,
      user.perfil,
      subscription.endpoint,
      subscription.keys.p256dh,
      subscription.keys.auth,
      String(userAgent || "").slice(0, 255),
    ],
  );

  return true;
}

async function removeSubscription(user, endpoint) {
  if (!endpoint) {
    return;
  }

  const pool = getDatabasePool();
  await pool.execute(
    "UPDATE push_subscriptions SET ativo = FALSE WHERE usuario_id = ? AND endpoint = ?",
    [user.id, endpoint],
  );
}

async function deactivateEndpoint(endpoint) {
  const pool = getDatabasePool();
  await pool.execute("UPDATE push_subscriptions SET ativo = FALSE WHERE endpoint = ?", [
    endpoint,
  ]);
}

async function listRecipients(institutionId) {
  const pool = getDatabasePool();
  const [rows] = await pool.query(
    `SELECT ps.endpoint, ps.p256dh, ps.auth
       FROM push_subscriptions ps
       INNER JOIN usuarios u ON u.id = ps.usuario_id
      WHERE ps.instituicao_id = ?
        AND ps.ativo = TRUE
        AND ps.perfil = ?
        AND u.perfil = ?
        AND u.ativo = TRUE`,
    [institutionId, recipientProfiles[0], recipientProfiles[0]],
  );

  return rows;
}

async function listUserSubscriptions(userId) {
  const pool = getDatabasePool();
  const [rows] = await pool.query(
    `SELECT id, endpoint, p256dh, auth, ativo, atualizado_em
       FROM push_subscriptions
      WHERE usuario_id = ?
      ORDER BY atualizado_em DESC`,
    [userId],
  );

  return rows;
}

async function ensureTransportRequestNotificationsTable() {
  const pool = getDatabasePool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS solicitacoes_transporte_notificacoes (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      solicitacao_transporte_id BIGINT UNSIGNED NOT NULL,
      enviada_em DATETIME NOT NULL,
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_solicitacao_transporte_notificacao (solicitacao_transporte_id),
      CONSTRAINT fk_solicitacoes_transporte_notificacoes_solicitacao
        FOREIGN KEY (solicitacao_transporte_id) REFERENCES solicitacoes_transporte (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function wasTransportRequestNotified(requestId) {
  const pool = getDatabasePool();
  const [rows] = await pool.query(
    `SELECT id
       FROM solicitacoes_transporte_notificacoes
      WHERE solicitacao_transporte_id = ?
      LIMIT 1`,
    [requestId],
  );

  return Boolean(rows[0]);
}

async function markTransportRequestNotified(requestId) {
  const pool = getDatabasePool();

  await pool.query(
    `INSERT IGNORE INTO solicitacoes_transporte_notificacoes
      (solicitacao_transporte_id, enviada_em)
     VALUES (?, NOW())`,
    [requestId],
  );
}

async function listDueTransportRequests(limit = 50) {
  const pool = getDatabasePool();
  const [rows] = await pool.query(
    `SELECT st.*
       FROM solicitacoes_transporte st
       LEFT JOIN solicitacoes_transporte_notificacoes stn
         ON stn.solicitacao_transporte_id = st.id
      WHERE st.situacao = 'PENDENTE'
        AND st.agendado_para <= NOW()
        AND stn.id IS NULL
      ORDER BY st.agendado_para ASC
      LIMIT ?`,
    [limit],
  );

  return rows;
}

function getEndpointHost(endpoint) {
  try {
    return new URL(endpoint).host;
  } catch {
    return "";
  }
}

async function sendToSubscription(row, payload) {
  const subscription = {
    endpoint: row.endpoint,
    keys: {
      p256dh: row.p256dh,
      auth: row.auth,
    },
  };

  try {
    await webPush.sendNotification(subscription, JSON.stringify(payload));
    return { ok: true };
  } catch (error) {
    if ([404, 410].includes(error.statusCode)) {
      await deactivateEndpoint(row.endpoint);
    }

    console.error("Falha ao enviar notificacao push.", {
      statusCode: error.statusCode,
      endpointHost: getEndpointHost(row.endpoint),
      message: error.message,
      body: error.body,
    });

    return {
      ok: false,
      statusCode: error.statusCode || null,
      message: error.message,
    };
  }
}

async function getUserSubscriptionStatus(user) {
  const rows = await listUserSubscriptions(user.id);
  const activeRows = rows.filter((row) => Boolean(row.ativo));

  return {
    configured: isPushConfigured(),
    total: rows.length,
    active: activeRows.length,
    latestUpdatedAt: rows[0]?.atualizado_em || null,
  };
}

async function sendTestNotification(user) {
  if (!configureWebPush()) {
    return {
      configured: false,
      sent: 0,
      failed: 0,
      results: [],
    };
  }

  const rows = (await listUserSubscriptions(user.id)).filter((row) => Boolean(row.ativo));
  const payload = {
    title: "Teste Transporte+",
    body: "Notificacao push de teste.",
    icon: "/app-icon-192.png",
    badge: "/app-icon-192.png",
    tag: `teste-push-${user.id}-${Date.now()}`,
    url: "/",
    data: {
      section: "atendimento",
      test: true,
    },
  };
  const results = await Promise.all(rows.map((row) => sendToSubscription(row, payload)));

  return {
    configured: true,
    sent: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    results,
  };
}

async function sendTransportRequestNotification(request) {
  if (!configureWebPush()) {
    console.warn("Notificacao push ignorada: VAPID nao configurado.");
    return;
  }

  if (!request?.instituicao_id) {
    console.warn("Notificacao push ignorada: solicitacao sem instituicao.", {
      requestId: request?.id,
    });
    return;
  }

  const recipients = await listRecipients(request.instituicao_id);

  if (!recipients.length) {
    console.warn("Notificacao push ignorada: nenhum motorista com inscricao ativa.", {
      institutionId: request.instituicao_id,
      requestId: request.id,
    });
    return;
  }

  const payload = {
    title: "Nova solicitacao de transporte",
    body: [request.nome_destino, request.prioridade && `Prioridade: ${request.prioridade}`]
      .filter(Boolean)
      .join(" - "),
    icon: "/app-icon-192.png",
    badge: "/app-icon-192.png",
    tag: `solicitacao-transporte-${request.id}`,
    url: "/",
    data: {
      section: "atendimento",
      requestId: request.id,
    },
  };

  const results = await Promise.all(recipients.map((row) => sendToSubscription(row, payload)));

  return {
    failed: results.filter((result) => !result.ok).length,
    sent: results.filter((result) => result.ok).length,
  };
}

async function notifyNewTransportRequest(request, options = {}) {
  if (options.notificar_motoristas === false || options.suprimir_notificacao === true) {
    return { skipped: true };
  }

  if (!isRequestDueForNotification(request)) {
    return { scheduled: true };
  }

  await ensureTransportRequestNotificationsTable();

  if (await wasTransportRequestNotified(request.id)) {
    return { skipped: true };
  }

  const result = await sendTransportRequestNotification(request);

  if (result?.sent > 0) {
    await markTransportRequestNotified(request.id);
  }

  return result;
}

async function processDueTransportRequestNotifications() {
  if (isProcessingTransportRequestNotifications) {
    return;
  }

  isProcessingTransportRequestNotifications = true;

  try {
    await ensureTransportRequestNotificationsTable();
    const requests = await listDueTransportRequests();

    for (const request of requests) {
      await notifyNewTransportRequest(request);
    }
  } catch (error) {
    console.error("Falha ao processar notificacoes agendadas de transporte.", error);
  } finally {
    isProcessingTransportRequestNotifications = false;
  }
}

function startTransportRequestNotificationScheduler() {
  if (transportRequestNotificationTimer) {
    return;
  }

  processDueTransportRequestNotifications();
  transportRequestNotificationTimer = setInterval(
    processDueTransportRequestNotifications,
    notificationIntervalMs,
  );
}

function stopTransportRequestNotificationScheduler() {
  if (!transportRequestNotificationTimer) {
    return;
  }

  clearInterval(transportRequestNotificationTimer);
  transportRequestNotificationTimer = null;
}

module.exports = {
  ensureTransportRequestNotificationsTable,
  getUserSubscriptionStatus,
  isPushConfigured,
  notifyNewTransportRequest,
  processDueTransportRequestNotifications,
  removeSubscription,
  saveSubscription,
  sendTestNotification,
  startTransportRequestNotificationScheduler,
  stopTransportRequestNotificationScheduler,
};
