const { createHmac, timingSafeEqual } = require("node:crypto");

const env = require("../config/env");
const createHttpError = require("./http-error");

const DEFAULT_EXPIRES_IN_SECONDS = 8 * 60 * 60;

function base64UrlEncode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function base64UrlDecode(value) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

function getSecret() {
  if (!env.jwt.secret) {
    throw createHttpError(500, "JWT_SECRET não configurado na API.");
  }

  return env.jwt.secret;
}

function parseExpiresIn(value) {
  const text = String(value || "").trim();
  const match = text.match(/^(\d+)([smhd])?$/i);

  if (!match) {
    return DEFAULT_EXPIRES_IN_SECONDS;
  }

  const amount = Number(match[1]);
  const unit = String(match[2] || "s").toLowerCase();
  const multipliers = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 24 * 60 * 60,
  };

  return amount * multipliers[unit];
}

function signPayload(encodedHeader, encodedPayload) {
  return createHmac("sha256", getSecret())
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");
}

function signAuthToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    sub: String(user.id),
    instituicao_id: user.instituicao_id,
    perfil: user.perfil,
    iat: now,
    exp: now + parseExpiresIn(env.jwt.expiresIn),
  };
  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload);
  const signature = signPayload(encodedHeader, encodedPayload);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifyAuthToken(token) {
  const parts = String(token || "").split(".");

  if (parts.length !== 3) {
    throw createHttpError(401, "Sessão inválida. Entre novamente.");
  }

  const [encodedHeader, encodedPayload, receivedSignature] = parts;
  const expectedSignature = signPayload(encodedHeader, encodedPayload);
  const receivedBuffer = Buffer.from(receivedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    throw createHttpError(401, "Sessão inválida. Entre novamente.");
  }

  const payload = base64UrlDecode(encodedPayload);
  const now = Math.floor(Date.now() / 1000);

  if (!payload.sub || !payload.perfil || !payload.exp || payload.exp < now) {
    throw createHttpError(401, "Sessão expirada. Entre novamente.");
  }

  return {
    id: Number(payload.sub),
    instituicao_id: payload.instituicao_id ? Number(payload.instituicao_id) : null,
    perfil: payload.perfil,
  };
}

module.exports = {
  signAuthToken,
  verifyAuthToken,
};
