const { getDatabasePool } = require("../database/connection");
const createHttpError = require("../utils/http-error");
const { randomBytes } = require("node:crypto");

const RECOVERY_CODE_TTL_MS = 10 * 60 * 1000;
const recoveryRequests = new Map();

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeText(value) {
  return String(value || "").trim().toUpperCase();
}

function maskEmail(email) {
  const [name, domain] = String(email || "").split("@");

  if (!name || !domain) {
    return "e-mail cadastrado";
  }

  const visible = name.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(3, name.length - 2))}@${domain}`;
}

function createCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function createToken() {
  return randomBytes(24).toString("hex");
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
      throw createHttpError(400, "Informe usuário e senha.");
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
      throw createHttpError(401, "Usuário ou senha inválidos.");
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

async function findActiveUserByCpf(cpf) {
  const pool = getDatabasePool();
  const [rows] = await pool.query(
    `
      SELECT id, cpf, email
        FROM usuarios
       WHERE ativo = TRUE
         AND REPLACE(REPLACE(REPLACE(cpf, '.', ''), '-', ''), ' ', '') = ?
       LIMIT 1
    `,
    [onlyDigits(cpf)],
  );

  return rows[0] || null;
}

function validateRecovery({ cpf, codigo, token_recuperacao }) {
  const cleanCpf = onlyDigits(cpf);
  const recovery = recoveryRequests.get(cleanCpf);

  if (!recovery) {
    return { error: "Solicite um novo código para redefinir a senha." };
  }

  if (Date.now() > recovery.expiresAt) {
    recoveryRequests.delete(cleanCpf);
    return { error: "Código expirado. Solicite um novo código." };
  }

  if (String(codigo || "").trim() !== recovery.code) {
    return { error: "Código inválido. Confira o código recebido." };
  }

  if (token_recuperacao && token_recuperacao !== recovery.token) {
    return { error: "Solicite um novo código para redefinir a senha." };
  }

  return { recovery };
}

async function requestPasswordRecovery(request, response, next) {
  try {
    const user = await findActiveUserByCpf(request.body?.cpf);

    if (!user) {
      throw createHttpError(404, "CPF não encontrado. Confira o CPF cadastrado.");
    }

    const code = createCode();
    const token = createToken();

    recoveryRequests.set(onlyDigits(user.cpf), {
      code,
      token,
      userId: user.id,
      expiresAt: Date.now() + RECOVERY_CODE_TTL_MS,
    });

    console.log(`[recuperacao] CPF ${user.cpf} codigo ${code}`);

    response.json({
      data: {
        email_mascarado: maskEmail(user.email),
        token_recuperacao: token,
        codigo_teste: code,
        expira_em_minutos: 10,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function validatePasswordRecoveryCode(request, response, next) {
  try {
    const validation = validateRecovery(request.body || {});

    if (validation.error) {
      throw createHttpError(400, validation.error);
    }

    response.json({
      data: {
        token_recuperacao: validation.recovery.token,
        codigo_valido: true,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function resetPassword(request, response, next) {
  try {
    const validation = validateRecovery(request.body || {});

    if (validation.error) {
      throw createHttpError(400, validation.error);
    }

    if (String(request.body?.nova_senha || "").length < 6) {
      throw createHttpError(400, "A nova senha deve ter pelo menos 6 caracteres.");
    }

    const pool = getDatabasePool();
    await pool.query(
      "UPDATE usuarios SET senha_hash = ? WHERE id = ?",
      [String(request.body.nova_senha), validation.recovery.userId],
    );
    recoveryRequests.delete(onlyDigits(request.body.cpf));

    response.json({ data: { senha_alterada: true } });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  login,
  requestPasswordRecovery,
  resetPassword,
  validatePasswordRecoveryCode,
};
