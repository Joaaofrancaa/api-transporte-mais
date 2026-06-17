const fs = require("node:fs");
const path = require("node:path");
const mysql = require("mysql2/promise");

function normalizeSqlForRailway(sql) {
  return sql
    .replace(/CREATE DATABASE IF NOT EXISTS[\s\S]*?;\s*/i, "")
    .replace(/USE\s+transporte_mais\s*;\s*/gi, "");
}

async function countRows(connection, tableName) {
  const [rows] = await connection.query(`SELECT COUNT(*) AS total FROM ${tableName}`);

  return Number(rows[0]?.total || 0);
}

async function keepOnlyOneMaster(connection) {
  const [masters] = await connection.query(
    "SELECT id, instituicao_id FROM usuarios WHERE perfil = 'MASTER' ORDER BY id",
  );

  if (!masters.length) {
    throw new Error("Nenhum usuario MASTER encontrado apos executar os inserts.");
  }

  const master = masters[0];
  const duplicateMasterIds = masters.slice(1).map((item) => Number(item.id));

  await connection.beginTransaction();

  try {
    await connection.query("DELETE FROM auditoria_logs");
    await connection.query("DELETE FROM chamados_suporte");
    await connection.query("DELETE FROM destinos_favoritos");
    await connection.query("DELETE FROM acompanhamentos_ambulancia");
    await connection.query("DELETE FROM solicitacoes_transporte");
    await connection.query("DELETE FROM motoristas");
    await connection.query("DELETE FROM acompanhantes");
    await connection.query("DELETE FROM medicos");
    await connection.query("DELETE FROM unidades");
    await connection.query("DELETE FROM setores");
    await connection.query("DELETE FROM usuarios WHERE perfil <> 'MASTER'");

    if (duplicateMasterIds.length) {
      await connection.query(
        `DELETE FROM usuarios WHERE id IN (${duplicateMasterIds.map(() => "?").join(", ")})`,
        duplicateMasterIds,
      );
    }

    await connection.query("DELETE FROM instituicoes WHERE id <> ?", [master.instituicao_id]);

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }

  const tablesToReset = [
    "auditoria_logs",
    "chamados_suporte",
    "destinos_favoritos",
    "acompanhamentos_ambulancia",
    "solicitacoes_transporte",
    "motoristas",
    "acompanhantes",
    "medicos",
    "unidades",
    "setores",
  ];

  for (const tableName of tablesToReset) {
    if ((await countRows(connection, tableName)) === 0) {
      await connection.query(`ALTER TABLE ${tableName} AUTO_INCREMENT = 1`);
    }
  }
}

async function main() {
  const databaseUrl = process.argv[2] || process.env.DATABASE_URL || process.env.MYSQL_URL;

  if (!databaseUrl) {
    throw new Error(
      "Informe a URL publica do MySQL: node scripts/setup-railway-database.js \"mysql://...\"",
    );
  }

  const connection = await mysql.createConnection({
    uri: databaseUrl,
    multipleStatements: true,
  });

  const databaseDir = path.resolve(__dirname, "../src/database");
  const createSql = normalizeSqlForRailway(
    fs.readFileSync(path.join(databaseDir, "create.sql"), "utf8"),
  );
  const insertsSql = normalizeSqlForRailway(
    fs.readFileSync(path.join(databaseDir, "inserts.sql"), "utf8"),
  );

  try {
    await connection.query(createSql);
    await connection.query(insertsSql);
    await keepOnlyOneMaster(connection);

    const [users] = await connection.query(
      "SELECT id, nome, nome_usuario, perfil, ativo FROM usuarios ORDER BY id",
    );
    const [institutions] = await connection.query(
      "SELECT id, nome, ativo FROM instituicoes ORDER BY id",
    );

    console.log("Banco Railway configurado com sucesso.");
    console.log(JSON.stringify({ users, institutions }, null, 2));
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
