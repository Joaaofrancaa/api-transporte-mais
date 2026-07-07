const { applicationDefault, cert, getApps, initializeApp } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");

const env = require("../config/env");
const { getDatabasePool } = require("../database/connection");

const recipientProfiles = ["MOTORISTA"];
const inactiveTokenErrorCodes = new Set([
  "messaging/invalid-argument",
  "messaging/registration-token-not-registered",
]);

let cachedMessagingClient;
let firebaseInitializationAttempted = false;

function normalizeFcmToken(token) {
  const normalized = String(token || "").trim();

  if (normalized.length < 20 || normalized.length > 512) {
    return "";
  }

  return normalized;
}

function normalizePlatform(platform) {
  const normalized = String(platform || "android")
    .trim()
    .toLowerCase();

  return normalized.slice(0, 30) || "android";
}

function normalizePrivateKey(privateKey) {
  return String(privateKey || "").replace(/\\n/g, "\n");
}

function parseServiceAccountJson(value) {
  if (!value) {
    return null;
  }

  return JSON.parse(value);
}

function parseServiceAccountBase64(value) {
  if (!value) {
    return null;
  }

  return JSON.parse(Buffer.from(value, "base64").toString("utf8"));
}

function getFirebaseCredential() {
  if (env.fcm.serviceAccountBase64) {
    return cert(parseServiceAccountBase64(env.fcm.serviceAccountBase64));
  }

  if (env.fcm.serviceAccountJson) {
    return cert(parseServiceAccountJson(env.fcm.serviceAccountJson));
  }

  if (env.fcm.projectId && env.fcm.clientEmail && env.fcm.privateKey) {
    return cert({
      projectId: env.fcm.projectId,
      clientEmail: env.fcm.clientEmail,
      privateKey: normalizePrivateKey(env.fcm.privateKey),
    });
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return applicationDefault();
  }

  return null;
}

function isFcmConfigured() {
  return Boolean(
    env.fcm.serviceAccountBase64 ||
      env.fcm.serviceAccountJson ||
      (env.fcm.projectId && env.fcm.clientEmail && env.fcm.privateKey) ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS,
  );
}

function getMessagingClient() {
  if (cachedMessagingClient || firebaseInitializationAttempted) {
    return cachedMessagingClient;
  }

  firebaseInitializationAttempted = true;

  try {
    const credential = getFirebaseCredential();

    if (!credential) {
      return null;
    }

    const app = getApps()[0] || initializeApp({ credential });
    cachedMessagingClient = getMessaging(app);

    return cachedMessagingClient;
  } catch (error) {
    console.error("Falha ao inicializar Firebase Admin.", {
      message: error.message,
    });

    return null;
  }
}

function isRecipientProfile(profile) {
  return recipientProfiles.includes(profile);
}

async function saveFcmToken(user, rawToken, platform = "android") {
  const token = normalizeFcmToken(rawToken);

  if (!token) {
    return { valid: false, registered: false };
  }

  if (!isRecipientProfile(user.perfil)) {
    return { valid: true, registered: false };
  }

  const pool = getDatabasePool();

  await pool.execute(
    `INSERT INTO fcm_push_tokens
      (instituicao_id, usuario_id, perfil, token, plataforma, ativo)
     VALUES (?, ?, ?, ?, ?, TRUE)
     ON DUPLICATE KEY UPDATE
      instituicao_id = VALUES(instituicao_id),
      usuario_id = VALUES(usuario_id),
      perfil = VALUES(perfil),
      plataforma = VALUES(plataforma),
      ativo = TRUE`,
    [
      user.instituicao_id,
      user.id,
      user.perfil,
      token,
      normalizePlatform(platform),
    ],
  );

  return { valid: true, registered: true };
}

async function removeFcmToken(user, rawToken) {
  const token = normalizeFcmToken(rawToken);

  if (!token) {
    return;
  }

  const pool = getDatabasePool();
  await pool.execute(
    "UPDATE fcm_push_tokens SET ativo = FALSE WHERE usuario_id = ? AND token = ?",
    [user.id, token],
  );
}

async function deactivateFcmToken(token) {
  const pool = getDatabasePool();
  await pool.execute("UPDATE fcm_push_tokens SET ativo = FALSE WHERE token = ?", [
    token,
  ]);
}

async function listRecipients(institutionId) {
  const pool = getDatabasePool();
  const [rows] = await pool.query(
    `SELECT fpt.token
       FROM fcm_push_tokens fpt
       INNER JOIN usuarios u ON u.id = fpt.usuario_id
      WHERE fpt.instituicao_id = ?
        AND fpt.ativo = TRUE
        AND fpt.perfil = ?
        AND u.perfil = ?
        AND u.ativo = TRUE`,
    [institutionId, recipientProfiles[0], recipientProfiles[0]],
  );

  return rows;
}

async function listUserFcmTokens(userId) {
  const pool = getDatabasePool();
  const [rows] = await pool.query(
    `SELECT id, plataforma, ativo, atualizado_em
       FROM fcm_push_tokens
      WHERE usuario_id = ?
      ORDER BY atualizado_em DESC`,
    [userId],
  );

  return rows;
}

async function getUserFcmTokenStatus(user) {
  const rows = await listUserFcmTokens(user.id);
  const activeRows = rows.filter((row) => Boolean(row.ativo));

  return {
    configured: isFcmConfigured(),
    total: rows.length,
    active: activeRows.length,
    latestUpdatedAt: rows[0]?.atualizado_em || null,
  };
}

function buildTransportRequestData(request, payload = {}) {
  return {
    type: "transport_request",
    section: "atendimento",
    requestId: request?.id,
    title: payload.title || "TRANSPORTE!",
    body:
      payload.body ||
      request?.nome_destino ||
      "Nova solicitacao recebida. Abra o atendimento.",
  };
}

function normalizeData(data) {
  return Object.fromEntries(
    Object.entries(data)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)]),
  );
}

function chunk(values, size) {
  const chunks = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

async function sendTransportRequestNotification(request, payload = {}) {
  const messaging = getMessagingClient();

  if (!messaging) {
    return {
      configured: false,
      sent: 0,
      failed: 0,
      skipped: true,
    };
  }

  const rows = await listRecipients(request.instituicao_id);
  const tokens = rows.map((row) => row.token).filter(Boolean);

  if (!tokens.length) {
    return {
      configured: true,
      sent: 0,
      failed: 0,
      skipped: true,
    };
  }

  let sent = 0;
  let failed = 0;
  const data = normalizeData(buildTransportRequestData(request, payload));

  for (const tokenChunk of chunk(tokens, 500)) {
    const response = await messaging.sendEachForMulticast({
      tokens: tokenChunk,
      data,
      android: {
        priority: "high",
        ttl: 60 * 60 * 1000,
      },
    });

    sent += response.successCount;
    failed += response.failureCount;

    await Promise.all(
      response.responses.map(async (result, index) => {
        const errorCode = result.error?.code;

        if (errorCode && inactiveTokenErrorCodes.has(errorCode)) {
          await deactivateFcmToken(tokenChunk[index]);
        }
      }),
    );
  }

  return {
    configured: true,
    sent,
    failed,
    skipped: false,
  };
}

module.exports = {
  getUserFcmTokenStatus,
  isFcmConfigured,
  removeFcmToken,
  saveFcmToken,
  sendTransportRequestNotification,
};
