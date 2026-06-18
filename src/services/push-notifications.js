const webPush = require("web-push");

const env = require("../config/env");
const { getDatabasePool } = require("../database/connection");

const recipientProfiles = ["MOTORISTA"];
const DUE_REQUEST_NOTIFICATION_INTERVAL_MS = 60 * 1000;

let dueRequestNotificationTimer;

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
    `SELECT endpoint, p256dh, auth
       FROM push_subscriptions
      WHERE instituicao_id = ?
        AND ativo = TRUE
        AND perfil = ?`,
    [institutionId, recipientProfiles[0]],
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

function getSaoPauloDateTimeKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    hour12: false,
    month: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second}`;
}

function formatDateTimeKey(value) {
  if (!value) {
    return "";
  }

  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    const hour = String(value.getHours()).padStart(2, "0");
    const minute = String(value.getMinutes()).padStart(2, "0");
    const second = String(value.getSeconds()).padStart(2, "0");

    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  }

  return String(value).replace("T", " ").slice(0, 19);
}

function isRequestDueForNotification(request) {
  const scheduledAt = formatDateTimeKey(request?.agendado_para);

  return !scheduledAt || scheduledAt <= getSaoPauloDateTimeKey();
}

async function claimRequestNotification(requestId) {
  if (!requestId) {
    return false;
  }

  const pool = getDatabasePool();
  const [result] = await pool.execute(
    "INSERT IGNORE INTO solicitacoes_transporte_notificacoes (solicitacao_id) VALUES (?)",
    [requestId],
  );

  return result.affectedRows > 0;
}

async function releaseRequestNotification(requestId) {
  if (!requestId) {
    return;
  }

  const pool = getDatabasePool();
  await pool.execute(
    "DELETE FROM solicitacoes_transporte_notificacoes WHERE solicitacao_id = ?",
    [requestId],
  );
}

async function notifyNewTransportRequest(request) {
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

  if (!isRequestDueForNotification(request)) {
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

  const canSend = await claimRequestNotification(request.id);

  if (!canSend) {
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

  if (results.every((result) => !result.ok)) {
    await releaseRequestNotification(request.id);
  }
}

async function notifyDueTransportRequests() {
  if (!configureWebPush()) {
    return;
  }

  const pool = getDatabasePool();
  const [rows] = await pool.query(
    `
      SELECT solicitacoes_transporte.*
        FROM solicitacoes_transporte
        LEFT JOIN solicitacoes_transporte_notificacoes
          ON solicitacoes_transporte_notificacoes.solicitacao_id = solicitacoes_transporte.id
       WHERE solicitacoes_transporte.situacao = 'PENDENTE'
         AND solicitacoes_transporte.agendado_para <= ?
         AND solicitacoes_transporte_notificacoes.id IS NULL
       ORDER BY solicitacoes_transporte.agendado_para ASC
       LIMIT 50
    `,
    [getSaoPauloDateTimeKey()],
  );

  for (const request of rows) {
    await notifyNewTransportRequest(request);
  }
}

function startDueTransportRequestNotifications() {
  if (dueRequestNotificationTimer) {
    return;
  }

  notifyDueTransportRequests().catch((error) => {
    console.error("Falha ao notificar solicitacoes de rotina vencidas.", error);
  });

  dueRequestNotificationTimer = setInterval(() => {
    notifyDueTransportRequests().catch((error) => {
      console.error("Falha ao notificar solicitacoes de rotina vencidas.", error);
    });
  }, DUE_REQUEST_NOTIFICATION_INTERVAL_MS);

  dueRequestNotificationTimer.unref?.();
}

function stopDueTransportRequestNotifications() {
  if (!dueRequestNotificationTimer) {
    return;
  }

  clearInterval(dueRequestNotificationTimer);
  dueRequestNotificationTimer = undefined;
}

module.exports = {
  getUserSubscriptionStatus,
  isPushConfigured,
  notifyNewTransportRequest,
  removeSubscription,
  saveSubscription,
  sendTestNotification,
  startDueTransportRequestNotifications,
  stopDueTransportRequestNotifications,
};
