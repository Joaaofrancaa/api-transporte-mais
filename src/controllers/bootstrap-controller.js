const { getDatabasePool } = require("../database/connection");
const { decryptCpf } = require("../utils/cpf-crypto");

function normalizeLimit(value) {
  const limit = Number(value || 200);

  if (!Number.isInteger(limit) || limit < 1) {
    return 200;
  }

  return Math.min(limit, 200);
}

function hidePasswordHash(user) {
  const visibleUser = { ...user };
  delete visibleUser.senha_hash;
  return visibleUser;
}

function sanitizeCpfRow(row) {
  if (!row || !Object.prototype.hasOwnProperty.call(row, "cpf")) {
    return row;
  }

  const visibleRow = { ...row, cpf: decryptCpf(row.cpf) };
  delete visibleRow.cpf_hash;
  return visibleRow;
}

async function queryList(connection, tableName, { institutionId, tenant = true, limit }) {
  const params = [];
  const where = [];

  if (tenant && institutionId) {
    where.push("instituicao_id = ?");
    params.push(institutionId);
  }

  params.push(limit);

  const [rows] = await connection.query(
    `SELECT *
       FROM ${tableName}
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY id DESC
      LIMIT ?`,
    params,
  );

  return rows;
}

async function listUsers(connection, { institutionId, isMaster, limit }) {
  const params = [];
  const where = [];

  if (!isMaster && institutionId) {
    where.push("u.instituicao_id = ?");
    params.push(institutionId);
  }

  params.push(limit);

  const [rows] = await connection.query(
    `SELECT
        u.*,
        i.nome AS instituicao_nome
       FROM usuarios u
       LEFT JOIN instituicoes i ON i.id = u.instituicao_id
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY u.id DESC
      LIMIT ?`,
    params,
  );

  return rows.map((row) => sanitizeCpfRow(hidePasswordHash(row)));
}

async function bootstrap(request, response, next) {
  const pool = getDatabasePool();
  const connection = await pool.getConnection();

  try {
    const user = request.authUser || {};
    const isMaster = user.perfil === "MASTER";
    const institutionId = isMaster ? null : user.instituicao_id;
    const limit = normalizeLimit(request.query?.limit);

    const [instituicoes] = await connection.query(
      "SELECT * FROM instituicoes ORDER BY id DESC LIMIT ?",
      [limit],
    );
    const usuarios = await listUsers(connection, {
      institutionId,
      isMaster,
      limit,
    });

    if (isMaster) {
      response.json({
        data: {
          instituicao_id: null,
          instituicoes,
          setores: [],
          unidades: [],
          usuarios,
          motoristas: [],
          medicos: [],
          acompanhantes: [],
          convenios: [],
          solicitacoes: [],
          acompanhamentos: [],
        },
      });
      return;
    }

    const [
      setores,
      unidades,
      motoristasRaw,
      medicos,
      acompanhantes,
      convenios,
      solicitacoes,
      acompanhamentos,
    ] = await Promise.all([
      queryList(connection, "setores", { institutionId, limit }),
      queryList(connection, "unidades", { institutionId, limit }),
      queryList(connection, "motoristas", { institutionId, limit }),
      queryList(connection, "medicos", { institutionId, limit }),
      queryList(connection, "acompanhantes", { institutionId, limit }),
      queryList(connection, "convenios", { institutionId, limit }),
      queryList(connection, "solicitacoes_transporte", { institutionId, limit }),
      queryList(connection, "acompanhamentos_ambulancia", { institutionId, limit }),
    ]);
    const motoristas = motoristasRaw.map(sanitizeCpfRow);

    response.json({
      data: {
        instituicao_id: institutionId,
        instituicoes,
        setores,
        unidades,
        usuarios,
        motoristas,
        medicos,
        acompanhantes,
        convenios,
        solicitacoes,
        acompanhamentos,
      },
    });
  } catch (error) {
    next(error);
  } finally {
    connection.release();
  }
}

module.exports = {
  bootstrap,
};
