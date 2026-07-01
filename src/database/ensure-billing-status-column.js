const { getDatabasePool } = require("./connection");

async function ensureBillingStatusColumn() {
  const pool = getDatabasePool();

  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'acompanhamentos_ambulancia'
        AND COLUMN_NAME = 'faturamento_status'`,
  );

  if (rows[0].count === 0) {
    await pool.query(`
      ALTER TABLE acompanhamentos_ambulancia
      ADD COLUMN faturamento_status ENUM('PENDENTE', 'FATURADO', 'NAO_FATURADO')
        NOT NULL DEFAULT 'PENDENTE'
    `);
  }
}

module.exports = { ensureBillingStatusColumn };
