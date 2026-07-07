const { getDatabasePool } = require("./connection");

async function ensureTransportCompaniesTable() {
  const pool = getDatabasePool();

  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count
       FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'empresas_transporte'`,
  );

  if (rows[0].count > 0) {
    return;
  }

  await pool.query(`
    CREATE TABLE empresas_transporte (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      instituicao_id BIGINT UNSIGNED NOT NULL,
      nome VARCHAR(120) NOT NULL,
      ativo BOOLEAN NOT NULL DEFAULT TRUE,
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_empresas_transporte_inst_nome (instituicao_id, nome),
      CONSTRAINT fk_empresas_transporte_instituicao
        FOREIGN KEY (instituicao_id) REFERENCES instituicoes (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

module.exports = { ensureTransportCompaniesTable };
