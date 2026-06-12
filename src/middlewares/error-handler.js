const env = require("../config/env");

function errorHandler(error, _request, response, _next) {
  const statusCode = error.statusCode || 500;

  if (statusCode >= 500) {
    console.error(error);
  }

  const body = {
    error:
      error.publicMessage ||
      (statusCode >= 500 ? "Erro interno do servidor." : error.message),
  };

  if (!env.isProduction && statusCode >= 500) {
    body.details = error.message;
  }

  response.status(statusCode).json(body);
}

module.exports = errorHandler;
