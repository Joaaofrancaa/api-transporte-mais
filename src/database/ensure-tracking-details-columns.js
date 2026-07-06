const { getDatabasePool } = require("./connection");

const TRACKING_DETAILS_COLUMNS = [
  { name: "convenio", definition: "VARCHAR(60) NULL" },
  { name: "codigo_carteirinha", definition: "VARCHAR(60) NULL" },
  { name: "paciente_tipo", definition: "VARCHAR(20) NULL" },
  { name: "paciente_entubado", definition: "VARCHAR(10) NULL" },
  { name: "tipo_trajeto", definition: "VARCHAR(30) NULL" },
  { name: "modo_espera", definition: "VARCHAR(30) NULL" },
];

async function ensureTrackingDetailsColumns() {
  const pool = getDatabasePool();

  for (const column of TRACKING_DETAILS_COLUMNS) {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS count
         FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'acompanhamentos_ambulancia'
          AND COLUMN_NAME = ?`,
      [column.name],
    );

    if (rows[0].count === 0) {
      await pool.query(`
        ALTER TABLE acompanhamentos_ambulancia
        ADD COLUMN ${column.name} ${column.definition}
      `);
    }
  }
}

module.exports = { ensureTrackingDetailsColumns };
