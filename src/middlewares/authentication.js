const { verifyAuthToken } = require("../utils/auth-token");
const { getDatabasePool } = require("../database/connection");
const createHttpError = require("../utils/http-error");

async function authentication(request, _response, next) {
  try {
    const authorization = String(request.headers.authorization || "");
    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw createHttpError(401, "Sessão obrigatória. Entre novamente.");
    }

    const authUser = verifyAuthToken(token);
    const pool = getDatabasePool();
    const [rows] = await pool.query(
      `SELECT id, instituicao_id, perfil
         FROM usuarios
        WHERE id = ?
          AND ativo = TRUE
        LIMIT 1`,
      [authUser.id],
    );
    const activeUser = rows[0];

    if (!activeUser) {
      throw createHttpError(401, "Sessao expirada. Entre novamente.");
    }

    request.authUser = {
      id: Number(activeUser.id),
      instituicao_id: activeUser.instituicao_id ? Number(activeUser.instituicao_id) : null,
      perfil: activeUser.perfil,
    };
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = authentication;
