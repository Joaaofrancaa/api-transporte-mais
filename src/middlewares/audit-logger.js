const { getDatabasePool } = require("../database/connection");

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const SENSITIVE_FIELDS = new Set([
  "senha",
  "password",
  "senha_hash",
  "token",
  "token_recuperacao",
  "codigo",
]);

function sanitizePayload(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizePayload);
  }

  if (value && typeof value === "object") {
    return Object.entries(value).reduce((payload, [key, item]) => {
      payload[key] = SENSITIVE_FIELDS.has(key) ? "[REMOVIDO]" : sanitizePayload(item);
      return payload;
    }, {});
  }

  return value;
}

function auditLogger(request, response, next) {
  if (!WRITE_METHODS.has(request.method)) {
    next();
    return;
  }

  const startedAt = Date.now();

  response.on("finish", () => {
    const pool = getDatabasePool();
    const user = request.authUser || {};

    pool
      .query(
        `INSERT INTO auditoria_logs
          (usuario_id, instituicao_id, perfil, metodo, rota, status_http, ip, user_agent, corpo_requisicao, criado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          user.id || null,
          user.instituicao_id || null,
          user.perfil || null,
          request.method,
          request.originalUrl,
          response.statusCode,
          request.ip,
          request.get("user-agent") || null,
          JSON.stringify({
            body: sanitizePayload(request.body || {}),
            params: sanitizePayload(request.params || {}),
            query: sanitizePayload(request.query || {}),
            duracao_ms: Date.now() - startedAt,
          }),
        ],
      )
      .catch((error) => {
        console.error("Falha ao registrar auditoria.", error);
      });
  });

  next();
}

module.exports = auditLogger;
