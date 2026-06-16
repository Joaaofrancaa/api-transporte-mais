const mysql = require("mysql2/promise");
const env = require("../src/config/env");

async function columnExists(connection) {
  const [rows] = await connection.query(
    `
      SELECT COUNT(*) AS total
        FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ?
         AND TABLE_NAME = 'instituicoes'
         AND COLUMN_NAME = 'usa_acompanhamento'
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
    if (await columnExists(connection)) {
      console.log("Coluna usa_acompanhamento já existe.");
      return;
    }

    await connection.query(`
      ALTER TABLE instituicoes
        ADD COLUMN usa_acompanhamento BOOLEAN NOT NULL DEFAULT TRUE AFTER cnpj
    `);
    console.log("Coluna usa_acompanhamento criada.");
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
