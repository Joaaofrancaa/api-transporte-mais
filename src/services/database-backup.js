const fs = require("node:fs/promises");
const path = require("node:path");

const env = require("../config/env");
const { getDatabasePool } = require("../database/connection");

let backupTimer;

function sqlString(value) {
  if (value === null || value === undefined) {
    return "NULL";
  }

  if (value instanceof Date) {
    return `'${value.toISOString().slice(0, 19).replace("T", " ")}'`;
  }

  if (Buffer.isBuffer(value)) {
    return `X'${value.toString("hex")}'`;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "NULL";
  }

  return `'${String(value).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
}

function sqlIdentifier(value) {
  return `\`${String(value).replace(/`/g, "``")}\``;
}

function buildInsert(table, row) {
  const columns = Object.keys(row);
  const values = columns.map((column) => sqlString(row[column]));

  return `INSERT INTO ${sqlIdentifier(table)} (${columns
    .map(sqlIdentifier)
    .join(", ")}) VALUES (${values.join(", ")});`;
}

async function createDatabaseBackup() {
  const pool = getDatabasePool();
  const backupDir = path.resolve(process.cwd(), env.backup.directory);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filePath = path.join(backupDir, `${env.database.name}-${timestamp}.sql`);

  await fs.mkdir(backupDir, { recursive: true });

  const [tables] = await pool.query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
  const tableNames = tables.map((row) => Object.values(row)[0]);
  const lines = [
    `-- Backup automatico do banco ${env.database.name}`,
    `-- Gerado em ${new Date().toISOString()}`,
    "SET FOREIGN_KEY_CHECKS = 0;",
    "",
  ];

  for (const table of tableNames) {
    const [rows] = await pool.query(`SELECT * FROM ${sqlIdentifier(table)}`);

    lines.push(`TRUNCATE TABLE ${sqlIdentifier(table)};`);

    for (const row of rows) {
      lines.push(buildInsert(table, row));
    }

    lines.push("");
  }

  lines.push("SET FOREIGN_KEY_CHECKS = 1;");
  lines.push("");

  await fs.writeFile(filePath, lines.join("\n"), "utf8");
  return filePath;
}

function startAutomaticBackups() {
  if (!env.backup.enabled || backupTimer) {
    return;
  }

  const intervalMs = env.backup.intervalHours * 60 * 60 * 1000;

  createDatabaseBackup()
    .then((filePath) => console.log(`Backup do banco criado: ${filePath}`))
    .catch((error) => console.error("Falha ao criar backup do banco.", error));

  backupTimer = setInterval(() => {
    createDatabaseBackup()
      .then((filePath) => console.log(`Backup do banco criado: ${filePath}`))
      .catch((error) => console.error("Falha ao criar backup do banco.", error));
  }, intervalMs);

  backupTimer.unref?.();
}

function stopAutomaticBackups() {
  if (!backupTimer) {
    return;
  }

  clearInterval(backupTimer);
  backupTimer = undefined;
}

module.exports = {
  createDatabaseBackup,
  startAutomaticBackups,
  stopAutomaticBackups,
};
