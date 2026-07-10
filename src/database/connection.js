const mysql = require("mysql2/promise");

const env = require("../config/env");

let pool;

function getDatabasePool() {
  if (!pool) {
    pool = mysql.createPool({
      host: env.database.host,
      port: env.database.port,
      user: env.database.user,
      password: env.database.password,
      database: env.database.name,
      waitForConnections: true,
      connectionLimit: env.database.connectionLimit,
      queueLimit: 0,
      enableKeepAlive: true,
      // Without this, mysql2 converts DATETIME/TIMESTAMP columns to JS Date
      // objects using the Node process's own local timezone. Our DATETIME
      // columns store naive wall-clock values (no timezone) meant literally
      // — e.g. "13:03" is 13:03, period. If the process timezone isn't the
      // same as whatever produced that value, the Date object silently
      // represents the wrong instant, and re-serializing it (toISOString(),
      // which JSON.stringify uses on Date objects) ships a shifted value to
      // the frontend. Forcing UTC makes mysql2 treat the raw value as-is,
      // so every DATETIME round-trips with the exact numbers that were
      // stored, regardless of the server's configured timezone.
      timezone: "Z",
    });
  }

  return pool;
}

async function closeDatabasePool() {
  if (!pool) {
    return;
  }

  await pool.end();
  pool = undefined;
}

module.exports = {
  getDatabasePool,
  closeDatabasePool,
};
