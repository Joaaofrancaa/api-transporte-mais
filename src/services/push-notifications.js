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

/**
 * Generic engine behind "notify drivers about a new dispatchable item"
 * (transport requests and, now, ambulance tracking records). Both resources
 * share the same due/lead-time math, web-push + FCM sending, and dedupe
 * table pattern — only table/field names and the notification payload differ.
 */
function createDispatchNotifier(config) {
  const {
    tableName,
    notificationsTableName,
    notificationsFkColumn,
    scheduledDateField,
    pendingSituacao,
    buildPayload,
    // When set, items whose scheduled date is already this far in the past
    // are treated as backdated/historical entries and never notified —
    // even if forceImmediateNotification is set — instead of blasting a
    // driver about a trip that (as far as the schedule says) already
    // happened a while ago.
    pastToleranceMs = null,
  } = config;

  let dueNotificationTimer;
  let isProcessingDueNotifications = false;

  // Compared entirely in SQL (like the "vencida" check below) instead of
  // parsing item[scheduledDateField] into a JS Date: mysql2 returns
  // DATETIME columns as Date objects built from the Node process's local
  // timezone, which on a server not configured for America/Sao_Paulo (e.g.
  // a UTC container) can be hours off from Date.now() — silently marking
  // every fresh record as "too stale" and swallowing the notification.
  async function isTooStaleToNotify(item) {
    if (pastToleranceMs == null || !item?.id) {
      return false;
    }

    const pool = getDatabasePool();
    const [rows] = await pool.query(
      `SELECT ${scheduledDateField} <= DATE_SUB(?, INTERVAL ? SECOND) AS too_stale
         FROM ${tableName}
        WHERE id = ?
        LIMIT 1`,
      [getCurrentLocalSqlDateTime(), Math.round(pastToleranceMs / 1000), item.id],
    );

    return Number(rows[0]?.too_stale) === 1;
  }

  function getScheduledDate(item) {
    const scheduledAt = item?.[scheduledDateField];

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

  function getNotificationDueDate(item, options = {}) {
    const scheduledDate = getScheduledDate(item);

    if (!scheduledDate) {
      return null;
    }

    return new Date(scheduledDate.getTime() - getNotificationLeadMs(options));
  }

  function isDueForNotification(item, options = {}) {
    const dueDate = getNotificationDueDate(item, options);

    return !dueDate || dueDate.getTime() <= Date.now();
  }

  function getNotificationDelayMs(item, options = {}) {
    if (options.notificar_motoristas_agora === true) {
      return cardRenderGracePeriodMs;
    }

    const dueDate = getNotificationDueDate({
      [scheduledDateField]: options[scheduledDateField] || item?.[scheduledDateField],
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

  async function getNotificationReadiness(itemId) {
    if (!itemId) {
      return null;
    }

    const pool = getDatabasePool();
    const [rows] = await pool.query(
      `SELECT situacao, ${scheduledDateField}, ${scheduledDateField} <= ? AS vencida
         FROM ${tableName}
        WHERE id = ?
        LIMIT 1`,
      [getCurrentLocalSqlDateTime(), itemId],
    );

    return rows[0] || null;
  }

  async function markNotified(itemId) {
    if (!itemId) {
      return;
    }

    const pool = getDatabasePool();

    await pool.execute(
      `INSERT IGNORE INTO ${notificationsTableName}
        (${notificationsFkColumn}, notificado_em)
       VALUES (?, NOW())`,
      [itemId],
    );
  }

  async function notifyNew(item, options = {}) {
    if (options.notificar_motoristas === false || options.suprimir_notificacao === true) {
      return { configured: true, sent: 0, failed: 0, skipped: true };
    }

    if (await isTooStaleToNotify(item)) {
      return { configured: true, sent: 0, failed: 0, skipped: true };
    }

    const forceImmediateNotification = options.notificar_motoristas_agora === true;
    const readiness = await getNotificationReadiness(item?.id);

    if (readiness) {
      const isPending = readiness.situacao === pendingSituacao;
      const isDue =
        forceImmediateNotification ||
        isDueForNotification(readiness, options) ||
        Number(readiness.vencida) === 1;

      if (!isPending || !isDue) {
        return { configured: true, sent: 0, failed: 0, skipped: true };
      }
    }

    if (
      !forceImmediateNotification &&
      !readiness &&
      !isDueForNotification(item, options)
    ) {
      return { configured: true, sent: 0, failed: 0, skipped: true };
    }

    const webPushConfigured = configureWebPush();
    const fcmConfigured = isFcmConfigured();

    if (!webPushConfigured && !fcmConfigured) {
      console.warn("Notificacao push ignorada: VAPID e Firebase nao configurados.");
      return { configured: false, sent: 0, failed: 0, skipped: true };
    }

    if (!item?.instituicao_id) {
      console.warn(`Notificacao push ignorada: ${tableName} sem instituicao.`, {
        id: item?.id,
      });
      return { configured: true, sent: 0, failed: 0, skipped: true };
    }

    const itemPayload = buildPayload(item);
    const payload = {
      icon: "/app-icon-192.png",
      badge: "/app-icon-192.png",
      url: "/",
      ...itemPayload,
      data: {
        section: "atendimento",
        ...itemPayload.data,
      },
    };

    let webSent = 0;
    let webFailed = 0;

    if (webPushConfigured) {
      const recipients = await listRecipients(item.instituicao_id);

      if (!recipients.length) {
        console.warn("Notificacao web push ignorada: nenhum motorista com inscricao ativa.", {
          institutionId: item.instituicao_id,
          id: item.id,
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
      ? await sendFcmTransportRequestNotification(item, payload)
      : { configured: false, sent: 0, failed: 0, skipped: true };
    const sent = webSent + fcmResult.sent;
    const failed = webFailed + fcmResult.failed;

    if (sent > 0) {
      await markNotified(item.id);
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

  function schedule(item, options = {}) {
    const delayMs = getNotificationDelayMs(item, options);

    setTimeout(() => {
      notifyNew(item, options).catch((error) => {
        console.error(`Falha ao enviar notificacao de novo item (${tableName}).`, error);
      });
    }, delayMs);

    return {
      scheduled: true,
      delayMs,
    };
  }

  async function listDueUnnotified(limit = 50) {
    const pool = getDatabasePool();
    const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 50, 1), 200);
    const notificationLookaheadDateTime = getCurrentLocalSqlDateTime(
      new Date(Date.now() + defaultNotificationLeadMinutes * 60 * 1000),
    );
    const [rows] = await pool.query(
      `SELECT t.*
         FROM ${tableName} t
         LEFT JOIN ${notificationsTableName} tn
           ON tn.${notificationsFkColumn} = t.id
        WHERE t.situacao = ?
          AND t.${scheduledDateField} <= ?
          AND tn.id IS NULL
        ORDER BY t.${scheduledDateField} ASC, t.id ASC
        LIMIT ?`,
      [pendingSituacao, notificationLookaheadDateTime, safeLimit],
    );

    return rows;
  }

  async function notifyDue() {
    if ((!isPushConfigured() && !isFcmConfigured()) || isProcessingDueNotifications) {
      return;
    }

    isProcessingDueNotifications = true;

    try {
      const items = await listDueUnnotified();

      for (const item of items) {
        await notifyNew(item);
      }
    } catch (error) {
      console.error(`Falha ao processar notificacoes pendentes (${tableName}).`, error);
    } finally {
      isProcessingDueNotifications = false;
    }
  }

  function startPolling() {
    if (dueNotificationTimer) {
      return;
    }

    notifyDue();
    dueNotificationTimer = setInterval(notifyDue, dueNotificationIntervalMs);
  }

  function stopPolling() {
    if (!dueNotificationTimer) {
      return;
    }

    clearInterval(dueNotificationTimer);
    dueNotificationTimer = undefined;
  }

  return { schedule, notifyNew, notifyDue, startPolling, stopPolling };
}

const transportRequestNotifier = createDispatchNotifier({
  tableName: "solicitacoes_transporte",
  notificationsTableName: "solicitacoes_transporte_notificacoes",
  notificationsFkColumn: "solicitacao_id",
  scheduledDateField: "agendado_para",
  pendingSituacao: "PENDENTE",
  buildPayload: (request) => ({
    title: "TRANSPORTE!",
    body: request.nome_destino || "",
    tag: `solicitacao-transporte-${request.id}`,
    data: { requestId: request.id },
  }),
});

const trackingNotifier = createDispatchNotifier({
  tableName: "acompanhamentos_ambulancia",
  notificationsTableName: "acompanhamentos_ambulancia_notificacoes",
  notificationsFkColumn: "acompanhamento_id",
  scheduledDateField: "saida_em",
  pendingSituacao: "AGENDADO",
  // Acompanhamentos should notify right away — but if staff entered a
  // departure that's already more than 10 minutes in the past (a backdated,
  // record-keeping-only entry), don't page a driver about it.
  pastToleranceMs: 10 * 60 * 1000,
  buildPayload: (record) => ({
    title: "TRANSPORTE!",
    body: record.nome_destino || record.nome_paciente || "",
    tag: `acompanhamento-ambulancia-${record.id}`,
    data: { trackingId: record.id },
  }),
});

function scheduleNewTransportRequestNotification(request, options = {}) {
  return transportRequestNotifier.schedule(request, options);
}

function scheduleNewTrackingNotification(record, options = {}) {
  return trackingNotifier.schedule(record, options);
}

async function notifyNewTransportRequest(request, options = {}) {
  return transportRequestNotifier.notifyNew(request, options);
}

async function notifyDueTransportRequests() {
  return transportRequestNotifier.notifyDue();
}

function startDueTransportRequestNotifications() {
  transportRequestNotifier.startPolling();
  trackingNotifier.startPolling();
}

function stopDueTransportRequestNotifications() {
  transportRequestNotifier.stopPolling();
  trackingNotifier.stopPolling();
}

module.exports = {
  getUserSubscriptionStatus,
  isPushConfigured,
  notifyDueTransportRequests,
  notifyNewTransportRequest,
  removeSubscription,
  saveSubscription,
  scheduleNewTransportRequestNotification,
  scheduleNewTrackingNotification,
  sendTestNotification,
  startDueTransportRequestNotifications,
  stopDueTransportRequestNotifications,
};
