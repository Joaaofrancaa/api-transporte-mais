const { getDatabasePool } = require("./connection");

async function ensureInstitutionLogoColumn() {
  const pool = getDatabasePool();

  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'instituicoes'
        AND COLUMN_NAME = 'logo'`,
  );

  if (rows[0].count === 0) {
    await pool.query(`
      ALTER TABLE instituicoes
      ADD COLUMN logo LONGTEXT NULL
    `);
  }
}

module.exports = { ensureInstitutionLogoColumn };
