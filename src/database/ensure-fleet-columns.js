const { getDatabasePool } = require("./connection");

async function columnExists(pool, tableName, columnName) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?`,
    [tableName, columnName],
  );

  return rows[0].count > 0;
}

async function ensureFleetColumns() {
  const pool = getDatabasePool();

  if (!(await columnExists(pool, "instituicoes", "usa_frota"))) {
    await pool.query(`
      ALTER TABLE instituicoes
      ADD COLUMN usa_frota BOOLEAN NOT NULL DEFAULT FALSE AFTER usa_acompanhamento
    `);
  }

  if (!(await columnExists(pool, "solicitacoes_transporte", "veiculo_id"))) {
    await pool.query(`
      ALTER TABLE solicitacoes_transporte
      ADD COLUMN veiculo_id BIGINT UNSIGNED NULL AFTER motorista_id,
      ADD CONSTRAINT fk_solicitacoes_veiculo
        FOREIGN KEY (veiculo_id) REFERENCES veiculos (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
    `);
  }

  if (!(await columnExists(pool, "acompanhamentos_ambulancia", "veiculo_id"))) {
    await pool.query(`
      ALTER TABLE acompanhamentos_ambulancia
      ADD COLUMN veiculo_id BIGINT UNSIGNED NULL AFTER motorista_id,
      ADD CONSTRAINT fk_acompanhamentos_veiculo
        FOREIGN KEY (veiculo_id) REFERENCES veiculos (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
    `);
  }

  if (!(await columnExists(pool, "acompanhamentos_ambulancia", "quilometragem_inicial"))) {
    await pool.query(`
      ALTER TABLE acompanhamentos_ambulancia
      ADD COLUMN quilometragem_inicial INT NULL AFTER veiculo_id
    `);
  }

  if (!(await columnExists(pool, "acompanhamentos_ambulancia", "quilometragem_final"))) {
    await pool.query(`
      ALTER TABLE acompanhamentos_ambulancia
      ADD COLUMN quilometragem_final INT NULL AFTER quilometragem_inicial
    `);
  }
}

module.exports = { ensureFleetColumns };
