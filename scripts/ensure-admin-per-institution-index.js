const mysql = require("mysql2/promise");
const env = require("../src/config/env");

async function columnExists(connection) {
  const [rows] = await connection.query(
    `
      SELECT COUNT(*) AS total
        FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ?
         AND TABLE_NAME = 'usuarios'
         AND COLUMN_NAME = 'administrador_instituicao_id'
    `,
    [env.database.name],
  );

  return Number(rows[0]?.total || 0) > 0;
}

async function indexExists(connection) {
  const [rows] = await connection.query(
    `
      SELECT COUNT(*) AS total
        FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = ?
         AND TABLE_NAME = 'usuarios'
         AND INDEX_NAME = 'uk_usuarios_um_admin_por_instituicao'
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
    if (!(await columnExists(connection))) {
      await connection.query(`
        ALTER TABLE usuarios
          ADD COLUMN administrador_instituicao_id BIGINT UNSIGNED
          GENERATED ALWAYS AS (
            CASE
              WHEN perfil = 'ADMINISTRADOR' AND ativo = TRUE THEN instituicao_id
              ELSE NULL
            END
          ) STORED
      `);
      console.log("Coluna administrador_instituicao_id criada.");
    }

    if (!(await indexExists(connection))) {
      await connection.query(`
        ALTER TABLE usuarios
          ADD UNIQUE KEY uk_usuarios_um_admin_por_instituicao (administrador_instituicao_id)
      `);
      console.log("Índice de um administrador por instituição criado.");
    }
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
