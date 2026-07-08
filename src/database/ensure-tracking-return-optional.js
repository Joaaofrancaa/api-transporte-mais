const { getDatabasePool } = require("./connection");

async function ensureTrackingReturnOptional() {
  const pool = getDatabasePool();

  const [columnRows] = await pool.query(
    `SELECT IS_NULLABLE
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'acompanhamentos_ambulancia'
        AND COLUMN_NAME = 'retorno_em'`,
  );

  if (columnRows[0] && columnRows[0].IS_NULLABLE === "NO") {
    await pool.query(`
      ALTER TABLE acompanhamentos_ambulancia
      MODIFY COLUMN retorno_em DATETIME NULL
    `);
  }

  const [constraintRows] = await pool.query(
    `SELECT CHECK_CLAUSE
       FROM information_schema.CHECK_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND CONSTRAINT_NAME = 'ck_acompanhamentos_periodo'`,
  );

  const checkClause = constraintRows[0]?.CHECK_CLAUSE || "";

  if (checkClause && !checkClause.includes("IS NULL")) {
    await pool.query(`
      ALTER TABLE acompanhamentos_ambulancia
      DROP CHECK ck_acompanhamentos_periodo
    `);
    await pool.query(`
      ALTER TABLE acompanhamentos_ambulancia
      ADD CONSTRAINT ck_acompanhamentos_periodo
        CHECK (retorno_em IS NULL OR retorno_em >= saida_em)
    `);
  }
}

module.exports = { ensureTrackingReturnOptional };
