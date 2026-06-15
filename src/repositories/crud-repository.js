const { getDatabasePool } = require("../database/connection");

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function normalizeLimit(value) {
  const limit = Number(value || DEFAULT_LIMIT);

  if (!Number.isInteger(limit) || limit < 1) {
    return DEFAULT_LIMIT;
  }

  return Math.min(limit, MAX_LIMIT);
}

function normalizeOffset(value) {
  const offset = Number(value || 0);

  if (!Number.isInteger(offset) || offset < 0) {
    return 0;
  }

  return offset;
}

function createCrudRepository({
  tableName,
  searchableColumns = [],
  defaultOrder = "id DESC",
  tenantColumn = "",
}) {
  const pool = () => getDatabasePool();

  async function list({ search, limit, offset, instituicao_id } = {}) {
    const values = [];
    const where = [];

    if (tenantColumn && instituicao_id) {
      where.push(`${tenantColumn} = ?`);
      values.push(instituicao_id);
    }

    if (search && searchableColumns.length) {
      where.push(
        `(${searchableColumns.map((column) => `${column} LIKE ?`).join(" OR ")})`,
      );
      values.push(...searchableColumns.map(() => `%${search}%`));
    }

    values.push(normalizeLimit(limit), normalizeOffset(offset));

    const [rows] = await pool().query(
      `
        SELECT *
          FROM ${tableName}
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY ${defaultOrder}
        LIMIT ? OFFSET ?
      `,
      values,
    );

    return rows;
  }

  async function findById(id) {
    const [rows] = await pool().query(
      `SELECT * FROM ${tableName} WHERE id = ? LIMIT 1`,
      [id],
    );

    return rows[0] || null;
  }

  async function create(data) {
    const columns = Object.keys(data).filter((key) => data[key] !== undefined);
    const values = columns.map((column) => data[column]);
    const placeholders = columns.map(() => "?").join(", ");

    const [result] = await pool().query(
      `
        INSERT INTO ${tableName} (${columns.join(", ")})
        VALUES (${placeholders})
      `,
      values,
    );

    return findById(result.insertId);
  }

  async function update(id, data) {
    const columns = Object.keys(data).filter((key) => data[key] !== undefined);

    if (!columns.length) {
      return findById(id);
    }

    const assignments = columns.map((column) => `${column} = ?`).join(", ");
    const values = columns.map((column) => data[column]);
    values.push(id);

    await pool().query(
      `
        UPDATE ${tableName}
           SET ${assignments}
         WHERE id = ?
      `,
      values,
    );

    return findById(id);
  }

  async function inactivate(id) {
    return update(id, { ativo: false });
  }

  return {
    create,
    findById,
    inactivate,
    list,
    update,
  };
}

module.exports = createCrudRepository;
