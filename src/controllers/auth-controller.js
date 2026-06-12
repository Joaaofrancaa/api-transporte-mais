const { getDatabasePool } = require("../database/connection");
const createHttpError = require("../utils/http-error");

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeText(value) {
  return String(value || "").trim().toUpperCase();
}

function getProfileAlias(identifier) {
  const normalizedIdentifier = normalizeText(identifier);

  if (normalizedIdentifier === "SOLICITANTE") {
    return "SOLICITANTE";
  }

  if (normalizedIdentifier === "MOTORISTA") {
    return "MOTORISTA";
  }

  if (normalizedIdentifier === "ADM" || normalizedIdentifier === "ADMIN") {
    return "ADMINISTRADOR";
  }

  return "";
}

async function login(request, response, next) {
  try {
    const { identifier, password } = request.body || {};

    if (!identifier || !password) {
      throw createHttpError(400, "Informe usuario e senha.");
    }

    const pool = getDatabasePool();
    const profileAlias = getProfileAlias(identifier);
    const [rows] = await pool.query(
      `
        SELECT
          u.id,
          u.setor_id,
          s.nome AS setor_nome,
          u.nome,
          u.nome_usuario,
          u.cpf,
          u.data_nascimento,
          u.email,
          u.telefone,
          u.perfil,
          u.senha_hash,
          u.ativo
        FROM usuarios u
        LEFT JOIN setores s ON s.id = u.setor_id
        WHERE u.ativo = TRUE
          AND (
            UPPER(u.nome_usuario) = ?
            OR UPPER(u.email) = ?
            OR REPLACE(REPLACE(REPLACE(u.cpf, '.', ''), '-', ''), ' ', '') = ?
            OR u.perfil = ?
          )
        LIMIT 1
      `,
      [
        normalizeText(identifier),
        normalizeText(identifier),
        onlyDigits(identifier),
        profileAlias,
      ],
    );

    const user = rows[0];

    if (!user || user.senha_hash !== password) {
      throw createHttpError(401, "Usuario ou senha invalidos.");
    }

    response.json({
      data: {
        id: user.id,
        name: user.nome,
        username: user.nome_usuario,
        cpf: user.cpf,
        birthDate: user.data_nascimento,
        email: user.email,
        phone: user.telefone,
        sector: user.setor_nome,
        role: {
          SOLICITANTE: "Solicitante",
          MOTORISTA: "Motorista",
          ADMINISTRADOR: "Administrador",
        }[user.perfil] || user.perfil,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  login,
};
