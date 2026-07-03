const mysql = require("mysql2/promise");
const env = require("../src/config/env");
const { encryptCpf, hashCpfDigits, isEncryptedCpf } = require("../src/utils/cpf-crypto");

const TABLE_NAME = "motoristas";
const OLD_INDEX_NAME = "uk_motoristas_cpf";
const NEW_INDEX_NAME = "uk_motoristas_cpf_hash";

async function columnExists(connection, columnName) {
  const [rows] = await connection.query(
    `
      SELECT COUNT(*) AS total
        FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ?
         AND TABLE_NAME = ?
         AND COLUMN_NAME = ?
    `,
    [env.database.name, TABLE_NAME, columnName],
  );

  return Number(rows[0]?.total || 0) > 0;
}

async function columnIsNullable(connection, columnName) {
  const [rows] = await connection.query(
    `
      SELECT IS_NULLABLE
        FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ?
         AND TABLE_NAME = ?
         AND COLUMN_NAME = ?
    `,
    [env.database.name, TABLE_NAME, columnName],
  );

  return rows[0]?.IS_NULLABLE === "YES";
}

async function indexExists(connection, indexName) {
  const [rows] = await connection.query(
    `
      SELECT COUNT(*) AS total
        FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = ?
         AND TABLE_NAME = ?
         AND INDEX_NAME = ?
    `,
    [env.database.name, TABLE_NAME, indexName],
  );

  return Number(rows[0]?.total || 0) > 0;
}

async function widenCpfColumnIfNeeded(connection) {
  const [rows] = await connection.query(
    `
      SELECT CHARACTER_MAXIMUM_LENGTH
        FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ?
         AND TABLE_NAME = ?
         AND COLUMN_NAME = 'cpf'
    `,
    [env.database.name, TABLE_NAME],
  );

  if (Number(rows[0]?.CHARACTER_MAXIMUM_LENGTH || 0) < 255) {
    await connection.query(`ALTER TABLE ${TABLE_NAME} MODIFY COLUMN cpf VARCHAR(255) NOT NULL`);
    console.log("Coluna cpf ampliada para VARCHAR(255).");
  }
}

async function backfillEncryptedCpf(connection) {
  const [rows] = await connection.query(`SELECT id, cpf FROM ${TABLE_NAME}`);
  let migrated = 0;

  for (const row of rows) {
    if (isEncryptedCpf(row.cpf)) {
      continue;
    }

    const encrypted = encryptCpf(row.cpf);
    const hash = hashCpfDigits(row.cpf);

    await connection.query(
      `UPDATE ${TABLE_NAME} SET cpf = ?, cpf_hash = ? WHERE id = ?`,
      [encrypted, hash, row.id],
    );
    migrated += 1;
  }

  console.log(`Backfill concluído: ${migrated} linha(s) migradas (de ${rows.length} total).`);
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
    if (!(await columnExists(connection, "cpf_hash"))) {
      await connection.query(
        `ALTER TABLE ${TABLE_NAME} ADD COLUMN cpf_hash VARCHAR(255) NULL AFTER cpf`,
      );
      console.log("Coluna cpf_hash criada (nullable).");
    }

    await widenCpfColumnIfNeeded(connection);
    await backfillEncryptedCpf(connection);

    if (await columnIsNullable(connection, "cpf_hash")) {
      const [pending] = await connection.query(
        `SELECT COUNT(*) AS total FROM ${TABLE_NAME} WHERE cpf_hash IS NULL`,
      );

      if (Number(pending[0]?.total || 0) === 0) {
        await connection.query(
          `ALTER TABLE ${TABLE_NAME} MODIFY COLUMN cpf_hash VARCHAR(255) NOT NULL`,
        );
        console.log("Coluna cpf_hash definida como NOT NULL.");
      } else {
        console.warn("Ainda há linhas com cpf_hash NULL; NOT NULL não aplicado.");
      }
    }

    if (await indexExists(connection, OLD_INDEX_NAME)) {
      await connection.query(`ALTER TABLE ${TABLE_NAME} DROP INDEX ${OLD_INDEX_NAME}`);
      console.log(`Índice antigo ${OLD_INDEX_NAME} removido.`);
    }

    if (!(await indexExists(connection, NEW_INDEX_NAME))) {
      await connection.query(
        `ALTER TABLE ${TABLE_NAME} ADD UNIQUE KEY ${NEW_INDEX_NAME} (cpf_hash)`,
      );
      console.log(`Índice ${NEW_INDEX_NAME} criado.`);
    }

    console.log("Migração de criptografia de CPF de motoristas concluída.");
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
