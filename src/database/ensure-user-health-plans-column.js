const { getDatabasePool } = require("./connection");

async function ensureUserHealthPlansColumn() {
  const pool = getDatabasePool();

  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'usuarios'
        AND COLUMN_NAME = 'convenios_permitidos'`,
  );

  if (rows[0].count === 0) {
    await pool.query(`
      ALTER TABLE usuarios
      ADD COLUMN convenios_permitidos TEXT NULL
    `);
  }
}

module.exports = { ensureUserHealthPlansColumn };
