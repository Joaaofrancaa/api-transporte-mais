const { getDatabasePool } = require("./connection");

const SITUACAO_ENUM_VALUES = [
  "AGENDADO",
  "ACEITO",
  "EM_ANDAMENTO",
  "CONCLUIDO",
  "CANCELADO",
];

const WORKFLOW_COLUMNS = [
  { name: "aceito_em", definition: "DATETIME NULL" },
  { name: "iniciado_em", definition: "DATETIME NULL" },
  { name: "finalizado_em", definition: "DATETIME NULL" },
];

async function ensureTrackingServiceWorkflow() {
  const pool = getDatabasePool();

  const [enumRows] = await pool.query(
    `SELECT COLUMN_TYPE
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'acompanhamentos_ambulancia'
        AND COLUMN_NAME = 'situacao'`,
  );
  const columnType = enumRows[0]?.COLUMN_TYPE || "";
  const enumUpToDate = SITUACAO_ENUM_VALUES.every((value) =>
    columnType.includes(`'${value}'`),
  );

  if (!enumUpToDate) {
    await pool.query(`
      ALTER TABLE acompanhamentos_ambulancia
      MODIFY situacao ENUM(${SITUACAO_ENUM_VALUES.map((value) => `'${value}'`).join(", ")})
      NOT NULL DEFAULT 'AGENDADO'
    `);
  }

  for (const column of WORKFLOW_COLUMNS) {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS count
         FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'acompanhamentos_ambulancia'
          AND COLUMN_NAME = ?`,
      [column.name],
    );

    if (rows[0].count === 0) {
      await pool.query(`
        ALTER TABLE acompanhamentos_ambulancia
        ADD COLUMN ${column.name} ${column.definition}
      `);
    }
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS acompanhamentos_ambulancia_notificacoes (
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
}

module.exports = { ensureTrackingServiceWorkflow };
