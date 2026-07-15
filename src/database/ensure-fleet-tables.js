const { getDatabasePool } = require("./connection");

async function ensureFleetTables() {
  const pool = getDatabasePool();

  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count
       FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'veiculos'`,
  );

  if (rows[0].count > 0) {
    return;
  }

  await pool.query(`
    CREATE TABLE veiculos (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      instituicao_id BIGINT UNSIGNED NOT NULL,
      nome VARCHAR(120) NOT NULL,
      placa VARCHAR(12) NOT NULL,
      modelo VARCHAR(120) NULL,
      ano SMALLINT NULL,
      combustivel VARCHAR(30) NULL,
      quilometragem_atual INT NULL DEFAULT 0,
      intervalo_troca_oleo_km INT NULL,
      intervalo_troca_oleo_dias INT NULL,
      quilometragem_ultima_troca_oleo INT NULL,
      data_ultima_troca_oleo DATE NULL,
      situacao ENUM('DISPONIVEL', 'EM_SERVICO', 'INATIVO') NOT NULL DEFAULT 'DISPONIVEL',
      ativo BOOLEAN NOT NULL DEFAULT TRUE,
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_veiculos_inst_placa (instituicao_id, placa),
      CONSTRAINT fk_veiculos_instituicao
        FOREIGN KEY (instituicao_id) REFERENCES instituicoes (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

module.exports = { ensureFleetTables };
