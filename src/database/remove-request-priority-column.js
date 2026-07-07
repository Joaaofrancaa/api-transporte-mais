const { getDatabasePool } = require("./connection");

async function removeRequestPriorityColumn() {
  const pool = getDatabasePool();

  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'solicitacoes_transporte'
        AND COLUMN_NAME = 'prioridade'`,
  );

  if (rows[0].count > 0) {
    await pool.query(`
      ALTER TABLE solicitacoes_transporte
      DROP COLUMN prioridade
    `);
  }
}

module.exports = { removeRequestPriorityColumn };
