const { getDatabasePool } = require("./connection");

async function ensureRequestUnitColumn() {
  const pool = getDatabasePool();

  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'solicitacoes_transporte'
        AND COLUMN_NAME = 'unidade_id'`,
  );

  if (rows[0].count === 0) {
    await pool.query(`
      ALTER TABLE solicitacoes_transporte
      ADD COLUMN unidade_id BIGINT UNSIGNED NULL AFTER setor_origem_id,
      ADD CONSTRAINT fk_solicitacoes_unidade
        FOREIGN KEY (unidade_id) REFERENCES unidades (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
    `);
  }
}

module.exports = { ensureRequestUnitColumn };
