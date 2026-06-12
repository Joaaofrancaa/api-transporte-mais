const env = require("../config/env");
const { getDatabasePool } = require("../database/connection");

function getHealth(_request, response) {
  response.json({
    status: "ok",
    service: env.appName,
    environment: env.nodeEnv,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}

async function getDatabaseHealth(_request, response, next) {
  try {
    const pool = getDatabasePool();
    await pool.query("SELECT 1");

    response.json({
      status: "ok",
      database: env.database.name,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    error.statusCode = 503;
    error.publicMessage = "Banco de dados indisponivel.";
    next(error);
  }
}

module.exports = {
  getHealth,
  getDatabaseHealth,
};
