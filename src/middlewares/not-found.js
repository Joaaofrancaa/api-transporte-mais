function notFound(request, response) {
  response.status(404).json({
    error: "Rota nao encontrada.",
    method: request.method,
    path: request.originalUrl,
  });
}

module.exports = notFound;
