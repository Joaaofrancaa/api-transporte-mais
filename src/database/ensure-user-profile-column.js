const { getDatabasePool } = require("./connection");

async function ensureUserProfileColumn() {
  const pool = getDatabasePool();

  const [rows] = await pool.query(
    `SELECT DATA_TYPE
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'usuarios'
        AND COLUMN_NAME = 'perfil'`,
  );

  if (rows[0] && rows[0].DATA_TYPE === "enum") {
    await pool.query(`
      ALTER TABLE usuarios
      MODIFY COLUMN perfil VARCHAR(255) NOT NULL DEFAULT 'SOLICITANTE'
    `);
  }
}

module.exports = { ensureUserProfileColumn };
