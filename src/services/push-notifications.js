const webPush = require("web-push");

const env = require("../config/env");
const { getDatabasePool } = require("../database/connection");
const {
  isFcmConfigured,
  sendTransportRequestNotification: sendFcmTransportRequestNotification,
} = require("./fcm-notifications");

const recipientProfiles = ["MOTORISTA"];
const dueNotificationIntervalMs = 5 * 1000;
const cardRenderGracePeriodMs = 0;
const defaultNotificationLeadMinutes = 60;
const maxNotificationTimeoutMs = 2 ** 31 - 1;
const notificationTimeZone = process.env.APP_TIME_ZONE || "America/Sao_Paulo";

let dueNotificationTimer;
let isProcessingDueNotifications = false;

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

function getNotificationLeadMs(options = {}) {
  if (
    !Object.prototype.hasOwnProperty.call(
      options,
      "notificar_motoristas_antecedencia_minutos",
    )
  ) {
    return defaultNotificationLeadMinutes * 60 * 1000;
  }

  const minutes = Number(options.notificar_motoristas_antecedencia_minutos);

  if (!Number.isFinite(minutes) || minutes <= 0) {
    return 0;
  }

  return minutes * 60 * 1000;
}

function getNotificationDueDate(request, options = {}) {
  const scheduledDate = getRequestScheduledDate(request);

  if (!scheduledDate) {
    return null;
  }

  return new Date(scheduledDate.getTime() - getNotificationLeadMs(options));
}

function isRequestDueForNotification(request, options = {}) {
  const dueDate = getNotificationDueDate(request, options);

  return !dueDate || dueDate.getTime() <= Date.now();
}

function getCurrentLocalSqlDateTime(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone: notificationTimeZone,
    year: "numeric",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second}`;
}

function getNotificationDelayMs(request, options = {}) {
  if (options.notificar_motoristas_agora === true) {
    return cardRenderGracePeriodMs;
  }

  const dueDate = getNotificationDueDate({
    agendado_para: options.agendado_para || request?.agendado_para,
  }, options);

  if (!dueDate) {
    return cardRenderGracePeriodMs;
  }

  const delayMs = dueDate.getTime() - Date.now() + cardRenderGracePeriodMs;

  if (delayMs <= cardRenderGracePeriodMs) {
    return cardRenderGracePeriodMs;
  }

  return Math.min(delayMs, maxNotificationTimeoutMs);
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

async function getTransportRequestNotificationReadiness(requestId) {
  if (!requestId) {
    return null;
  }

  const pool = getDatabasePool();
  const [rows] = await pool.query(
    `SELECT situacao, agendado_para, agendado_para <= ? AS vencida
       FROM solicitacoes_transporte
      WHERE id = ?
      LIMIT 1`,
    [getCurrentLocalSqlDateTime(), requestId],
  );

  return rows[0] || null;
}

async function notifyNewTransportRequest(request, options = {}) {
  if (options.notificar_motoristas === false || options.suprimir_notificacao === true) {
    return { configured: true, sent: 0, failed: 0, skipped: true };
  }

  const forceImmediateNotification = options.notificar_motoristas_agora === true;
  const readiness = await getTransportRequestNotificationReadiness(request?.id);

  if (readiness) {
    const isPending = readiness.situacao === "PENDENTE";
    const isDue =
      forceImmediateNotification ||
      isRequestDueForNotification(readiness, options) ||
      Number(readiness.vencida) === 1;

    if (!isPending || !isDue) {
      return { configured: true, sent: 0, failed: 0, skipped: true };
    }
  }

  if (
    !forceImmediateNotification &&
    !readiness &&
    !isRequestDueForNotification(request, options)
  ) {
    return { configured: true, sent: 0, failed: 0, skipped: true };
  }

  const webPushConfigured = configureWebPush();
  const fcmConfigured = isFcmConfigured();

  if (!webPushConfigured && !fcmConfigured) {
    console.warn("Notificacao push ignorada: VAPID e Firebase nao configurados.");
    return { configured: false, sent: 0, failed: 0, skipped: true };
  }

  if (!request?.instituicao_id) {
    console.warn("Notificacao push ignorada: solicitacao sem instituicao.", {
      requestId: request?.id,
    });
    return { configured: true, sent: 0, failed: 0, skipped: true };
  }

  const payload = {
    title: "TRANSPORTE!",
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

  let webSent = 0;
  let webFailed = 0;

  if (webPushConfigured) {
    const recipients = await listRecipients(request.instituicao_id);

    if (!recipients.length) {
      console.warn("Notificacao web push ignorada: nenhum motorista com inscricao ativa.", {
        institutionId: request.instituicao_id,
        requestId: request.id,
      });
    } else {
      const results = await Promise.all(
        recipients.map((row) => sendToSubscription(row, payload)),
      );
      webSent = results.filter((result) => result.ok).length;
      webFailed = results.length - webSent;
    }
  }

  const fcmResult = fcmConfigured
    ? await sendFcmTransportRequestNotification(request, payload)
    : { configured: false, sent: 0, failed: 0, skipped: true };
  const sent = webSent + fcmResult.sent;
  const failed = webFailed + fcmResult.failed;

  if (sent > 0) {
    await markTransportRequestNotified(request.id);
  }

  return {
    configured: true,
    sent,
    failed,
    skipped: sent === 0 && failed === 0,
    channels: {
      web: {
        configured: webPushConfigured,
        sent: webSent,
        failed: webFailed,
      },
      fcm: fcmResult,
    },
  };
}

function scheduleNewTransportRequestNotification(request, options = {}) {
  const delayMs = getNotificationDelayMs(request, options);

  setTimeout(() => {
    notifyNewTransportRequest(request, options).catch((error) => {
      console.error("Falha ao enviar notificacao de nova solicitacao.", error);
    });
  }, delayMs);

  return {
    scheduled: true,
    delayMs,
  };
}

async function markTransportRequestNotified(requestId) {
  if (!requestId) {
    return;
  }

  const pool = getDatabasePool();

  await pool.execute(
    `INSERT IGNORE INTO solicitacoes_transporte_notificacoes
      (solicitacao_id, notificado_em)
     VALUES (?, NOW())`,
    [requestId],
  );
}

async function listDueUnnotifiedTransportRequests(limit = 50) {
  const pool = getDatabasePool();
  const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 50, 1), 200);
  const notificationLookaheadDateTime = getCurrentLocalSqlDateTime(
    new Date(Date.now() + defaultNotificationLeadMinutes * 60 * 1000),
  );
  const [rows] = await pool.query(
    `SELECT st.*
       FROM solicitacoes_transporte st
       LEFT JOIN solicitacoes_transporte_notificacoes stn
         ON stn.solicitacao_id = st.id
      WHERE st.situacao = 'PENDENTE'
        AND st.agendado_para <= ?
        AND stn.id IS NULL
      ORDER BY st.agendado_para ASC, st.id ASC
      LIMIT ?`,
    [notificationLookaheadDateTime, safeLimit],
  );

  return rows;
}

async function notifyDueTransportRequests() {
  if ((!isPushConfigured() && !isFcmConfigured()) || isProcessingDueNotifications) {
    return;
  }

  isProcessingDueNotifications = true;

  try {
    const requests = await listDueUnnotifiedTransportRequests();

    for (const request of requests) {
      await notifyNewTransportRequest(request);
    }
  } catch (error) {
    console.error("Falha ao processar notificacoes pendentes.", error);
  } finally {
    isProcessingDueNotifications = false;
  }
}

function startDueTransportRequestNotifications() {
  if (dueNotificationTimer) {
    return;
  }

  notifyDueTransportRequests();
  dueNotificationTimer = setInterval(
    notifyDueTransportRequests,
    dueNotificationIntervalMs,
  );
}

function stopDueTransportRequestNotifications() {
  if (!dueNotificationTimer) {
    return;
  }

  clearInterval(dueNotificationTimer);
  dueNotificationTimer = undefined;
}

module.exports = {
  getUserSubscriptionStatus,
  isPushConfigured,
  notifyDueTransportRequests,
  notifyNewTransportRequest,
  removeSubscription,
  saveSubscription,
  scheduleNewTransportRequestNotification,
  sendTestNotification,
  startDueTransportRequestNotifications,
  stopDueTransportRequestNotifications,
};
