const mysql = require("mysql2/promise");
const env = require("../src/config/env");

const columns = [
  {
    name: "aceito_em",
    definition: "ADD COLUMN aceito_em DATETIME NULL AFTER situacao",
  },
  {
    name: "iniciado_em",
    definition: "ADD COLUMN iniciado_em DATETIME NULL AFTER aceito_em",
  },
  {
    name: "finalizado_em",
    definition: "ADD COLUMN finalizado_em DATETIME NULL AFTER iniciado_em",
  },
];

const situacaoEnumValues = [
  "AGENDADO",
  "ACEITO",
  "EM_ANDAMENTO",
  "CONCLUIDO",
  "CANCELADO",
];

async function columnExists(connection, columnName) {
  const [rows] = await connection.query(
    `
      SELECT COUNT(*) AS total
        FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ?
         AND TABLE_NAME = 'acompanhamentos_ambulancia'
         AND COLUMN_NAME = ?
    `,
    [env.database.name, columnName],
  );

  return Number(rows[0]?.total || 0) > 0;
}

async function situacaoEnumUpToDate(connection) {
  const [rows] = await connection.query(
    `
      SELECT COLUMN_TYPE
        FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ?
         AND TABLE_NAME = 'acompanhamentos_ambulancia'
         AND COLUMN_NAME = 'situacao'
    `,
    [env.database.name],
  );
  const columnType = rows[0]?.COLUMN_TYPE || "";

  return situacaoEnumValues.every((value) => columnType.includes(`'${value}'`));
}

async function tableExists(connection, tableName) {
  const [rows] = await connection.query(
    `
      SELECT COUNT(*) AS total
        FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ?
         AND TABLE_NAME = ?
    `,
    [env.database.name, tableName],
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
    if (await situacaoEnumUpToDate(connection)) {
      console.log("Enum situacao ja atualizado.");
    } else {
      await connection.query(`
        ALTER TABLE acompanhamentos_ambulancia
          MODIFY situacao ENUM(${situacaoEnumValues.map((value) => `'${value}'`).join(", ")})
          NOT NULL DEFAULT 'AGENDADO'
      `);
      console.log("Enum situacao atualizado.");
    }

    for (const column of columns) {
      if (await columnExists(connection, column.name)) {
        console.log(`Coluna ${column.name} ja existe.`);
        continue;
      }

      await connection.query(`
        ALTER TABLE acompanhamentos_ambulancia
          ${column.definition}
      `);
      console.log(`Coluna ${column.name} criada.`);
    }

    if (await tableExists(connection, "acompanhamentos_ambulancia_notificacoes")) {
      console.log("Tabela acompanhamentos_ambulancia_notificacoes ja existe.");
    } else {
      await connection.query(`
        CREATE TABLE acompanhamentos_ambulancia_notificacoes (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          acompanhamento_id BIGINT UNSIGNED NOT NULL,
          notificado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uk_acompanhamentos_ambulancia_notificacoes_acompanhamento (acompanhamento_id),
          KEY idx_acompanhamentos_ambulancia_notificacoes_notificado_em (notificado_em),
          CONSTRAINT fk_acompanhamentos_ambulancia_notificacoes_acompanhamento
            FOREIGN KEY (acompanhamento_id) REFERENCES acompanhamentos_ambulancia (id)
            ON UPDATE CASCADE
            ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log("Tabela acompanhamentos_ambulancia_notificacoes criada.");
    }
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
