const { getDatabasePool } = require("./connection");

async function ensureRequestRoutineColumn() {
  const pool = getDatabasePool();

  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'solicitacoes_transporte'
        AND COLUMN_NAME = 'is_rotina'`,
  );

  if (rows[0].count === 0) {
    await pool.query(`
      ALTER TABLE solicitacoes_transporte
      ADD COLUMN is_rotina BOOLEAN NOT NULL DEFAULT FALSE
    `);
  }
}

module.exports = { ensureRequestRoutineColumn };
