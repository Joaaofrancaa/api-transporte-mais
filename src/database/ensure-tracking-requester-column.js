const { getDatabasePool } = require("./connection");

async function ensureTrackingRequesterColumn() {
  const pool = getDatabasePool();

  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'acompanhamentos_ambulancia'
        AND COLUMN_NAME = 'solicitante_usuario_id'`,
  );

  if (rows[0].count === 0) {
    await pool.query(`
      ALTER TABLE acompanhamentos_ambulancia
      ADD COLUMN solicitante_usuario_id BIGINT UNSIGNED NULL
    `);
  }
}

module.exports = { ensureTrackingRequesterColumn };
