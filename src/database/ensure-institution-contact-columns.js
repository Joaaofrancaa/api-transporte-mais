const { getDatabasePool } = require("./connection");

const INSTITUTION_CONTACT_COLUMNS = [
  { name: "endereco", definition: "VARCHAR(255) NULL" },
  { name: "numero", definition: "VARCHAR(20) NULL" },
  { name: "cep", definition: "VARCHAR(9) NULL" },
  { name: "telefone", definition: "VARCHAR(20) NULL" },
];

async function ensureInstitutionContactColumns() {
  const pool = getDatabasePool();

  for (const column of INSTITUTION_CONTACT_COLUMNS) {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS count
         FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'instituicoes'
          AND COLUMN_NAME = ?`,
      [column.name],
    );

    if (rows[0].count === 0) {
      await pool.query(`
        ALTER TABLE instituicoes
        ADD COLUMN ${column.name} ${column.definition}
      `);
    }
  }
}

module.exports = { ensureInstitutionContactColumns };
