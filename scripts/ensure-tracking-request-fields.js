const mysql = require("mysql2/promise");
const env = require("../src/config/env");

const columns = [
  {
    name: "convenio",
    definition: "ADD COLUMN convenio VARCHAR(60) NULL AFTER nome_paciente",
  },
  {
    name: "codigo_carteirinha",
    definition: "ADD COLUMN codigo_carteirinha VARCHAR(60) NULL AFTER convenio",
  },
  {
    name: "paciente_entubado",
    definition: "ADD COLUMN paciente_entubado VARCHAR(10) NULL AFTER codigo_carteirinha",
  },
  {
    name: "tipo_trajeto",
    definition: "ADD COLUMN tipo_trajeto VARCHAR(30) NULL AFTER paciente_entubado",
  },
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

async function main() {
  const connection = await mysql.createConnection({
    host: env.database.host,
    port: env.database.port,
    user: env.database.user,
    password: env.database.password,
    database: env.database.name,
  });

  try {
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
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
