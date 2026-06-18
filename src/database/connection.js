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
      dateStrings: true,
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
