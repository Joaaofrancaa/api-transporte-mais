const { verifyAuthToken } = require("../utils/auth-token");
const createHttpError = require("../utils/http-error");

function authentication(request, _response, next) {
  try {
    const authorization = String(request.headers.authorization || "");
    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw createHttpError(401, "Sessão obrigatória. Entre novamente.");
    }

    request.authUser = verifyAuthToken(token);
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = authentication;
