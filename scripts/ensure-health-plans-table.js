const mysql = require("mysql2/promise");
const env = require("../src/config/env");

async function tableExists(connection) {
  const [rows] = await connection.query(
    `
      SELECT COUNT(*) AS total
        FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ?
         AND TABLE_NAME = 'convenios'
    `,
    [env.database.name],
  );

  return Number(rows[0]?.total || 0) > 0;
}

async function main() {
  const connection = await mysql.createConnection({
    host: env.database.host,
    port: env.database.port,
    user: env.database.user,
    password: env.database.password,
    database: env.database.name,
  });

  try {
    if (await tableExists(connection)) {
      console.log("Tabela convenios ja existe.");
      return;
    }

    await connection.query(`
      CREATE TABLE convenios (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        instituicao_id BIGINT UNSIGNED NOT NULL,
        nome VARCHAR(120) NOT NULL,
        ativo BOOLEAN NOT NULL DEFAULT TRUE,
        criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_convenios_instituicao_nome (instituicao_id, nome),
        CONSTRAINT fk_convenios_instituicao
          FOREIGN KEY (instituicao_id) REFERENCES instituicoes (id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("Tabela convenios criada.");
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
