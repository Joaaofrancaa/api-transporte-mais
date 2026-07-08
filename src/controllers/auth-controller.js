const { randomBytes } = require("node:crypto");

const { getDatabasePool } = require("../database/connection");
const { sendEmail } = require("../utils/smtp-mailer");
const createHttpError = require("../utils/http-error");
const {
  hashPassword,
  verifyPassword,
} = require("../utils/password-hash");
const { decryptCpf, hashCpfDigits } = require("../utils/cpf-crypto");
const { signAuthToken } = require("../utils/auth-token");
const { getBasePerfil } = require("../utils/perfil");

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

async function login(request, response, next) {
  try {
    const { identifier, password } = request.body || {};

    if (!identifier || !password) {
      throw createHttpError(400, "Informe usuário e senha.");
    }

    const pool = getDatabasePool();
    const cpfDigits = onlyDigits(identifier);
    const cpfHash = hashCpfDigits(cpfDigits);
    const [rows] = await pool.query(
      `
        SELECT
          u.id,
          u.instituicao_id,
          i.nome AS instituicao_nome,
          i.usa_acompanhamento,
          u.setor_id,
          s.nome AS setor_nome,
          u.nome,
          u.nome_usuario,
          u.cpf,
          u.email,
          u.telefone,
          u.perfil,
          u.senha_hash,
          u.ativo
        FROM usuarios u
        LEFT JOIN instituicoes i ON i.id = u.instituicao_id
        LEFT JOIN setores s ON s.id = u.setor_id
        WHERE u.ativo = TRUE
          AND (
            UPPER(u.nome_usuario) = ?
            OR UPPER(u.email) = ?
            OR u.cpf_hash = ?
          )
        ORDER BY u.id DESC
      `,
      [
        normalizeText(identifier),
        normalizeText(identifier),
        cpfHash,
      ],
    );

    const user = rows.find((item) => verifyPassword(password, item.senha_hash));

    if (!user) {
      throw createHttpError(401, "Usuário ou senha inválidos.");
    }

    response.json({
      data: {
        id: user.id,
        instituicao_id: user.instituicao_id,
        instituicao_nome: user.instituicao_nome,
        usa_acompanhamento: Boolean(user.usa_acompanhamento),
        name: user.nome,
        username: user.nome_usuario,
        cpf: decryptCpf(user.cpf),
        email: user.email,
        phone: user.telefone,
        sector: user.setor_nome,
        role: {
          SOLICITANTE: "Solicitante",
          MOTORISTA: "Motorista",
          ADMINISTRADOR: "Administrador",
          MASTER: "Master",
        }[getBasePerfil(user.perfil)] || getBasePerfil(user.perfil),
        token: signAuthToken(user),
      },
    });
  } catch (error) {
    next(error);
  }
}

async function findActiveUserByCpf(cpf) {
  const pool = getDatabasePool();
  const cpfHash = hashCpfDigits(onlyDigits(cpf));
  const [rows] = await pool.query(
    `
      SELECT id, cpf, email
        FROM usuarios
       WHERE ativo = TRUE
         AND cpf_hash = ?
       LIMIT 1
    `,
    [cpfHash],
  );

  const user = rows[0];

  return user ? { ...user, cpf: decryptCpf(user.cpf) } : null;
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

async function sendRecoveryCode(email, code) {
  await sendEmail({
    to: email,
    subject: "Código de recuperação de senha - Transporte+",
    text: [
      "Olá.",
      "",
      `Seu código de recuperação de senha do Transporte+ é: ${code}`,
      "",
      "Este código expira em 10 minutos.",
      "Se você não solicitou a recuperação, ignore este e-mail.",
    ].join("\n"),
  });
}

async function requestPasswordRecovery(request, response, next) {
  try {
    const user = await findActiveUserByCpf(request.body?.cpf);

    if (!user) {
      throw createHttpError(404, "CPF não encontrado. Confira o CPF cadastrado.");
    }

    const code = createCode();
    const token = createToken();

    try {
      await sendRecoveryCode(user.email, code);
    } catch (error) {
      console.error("SMTP_RECOVERY_ERROR " + JSON.stringify({
        message: error.message,
        code: error.code,
        errno: error.errno,
        syscall: error.syscall,
        address: error.address,
        port: error.port,
      }));
      throw createHttpError(
        503,
        error.message === "Envio de e-mail não configurado."
          ? "Envio de e-mail não configurado. Configure o SMTP da API para enviar o código."
          : "Não foi possível enviar o código por e-mail. Tente novamente.",
      );
    }

    recoveryRequests.set(onlyDigits(user.cpf), {
      code,
      token,
      userId: user.id,
      expiresAt: Date.now() + RECOVERY_CODE_TTL_MS,
    });

    response.json({
      data: {
        email_mascarado: maskEmail(user.email),
        token_recuperacao: token,
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
      [hashPassword(request.body.nova_senha), validation.recovery.userId],
    );
    recoveryRequests.delete(onlyDigits(request.body.cpf));

    response.json({ data: { senha_alterada: true } });
  } catch (error) {
    next(error);
  }
}

async function changePassword(request, response, next) {
  try {
    const { identifier, senha_atual, nova_senha } = request.body || {};

    if (!identifier || !senha_atual || !nova_senha) {
      throw createHttpError(400, "Informe usuário, senha atual e nova senha.");
    }

    if (String(nova_senha).length < 6) {
      throw createHttpError(400, "A nova senha deve ter pelo menos 6 caracteres.");
    }

    const pool = getDatabasePool();
    const cpfHash = hashCpfDigits(onlyDigits(identifier));
    const [rows] = await pool.query(
      `SELECT id, senha_hash FROM usuarios
       WHERE ativo = TRUE
         AND (UPPER(nome_usuario) = ? OR UPPER(email) = ? OR cpf_hash = ?)
       ORDER BY id DESC`,
      [normalizeText(identifier), normalizeText(identifier), cpfHash],
    );

    const user = rows.find((item) => verifyPassword(senha_atual, item.senha_hash));
    if (!user) {
      throw createHttpError(401, "Senha atual incorreta.");
    }

    await pool.query("UPDATE usuarios SET senha_hash = ? WHERE id = ?", [
      hashPassword(nova_senha),
      user.id,
    ]);

    response.json({ data: { senha_alterada: true } });
  } catch (error) {
    next(error);
  }
}

async function changeEmail(request, response, next) {
  try {
    const { identifier, senha_atual, email_atual, novo_email } = request.body || {};

    if (!identifier || !senha_atual || !email_atual || !novo_email) {
      throw createHttpError(400, "Informe todos os campos obrigatórios.");
    }

    const normalizedNovo = String(novo_email).trim().toLowerCase();
    if (!normalizedNovo.includes("@")) {
      throw createHttpError(400, "Informe um e-mail válido.");
    }

    const pool = getDatabasePool();
    const cpfHash = hashCpfDigits(onlyDigits(identifier));
    const [rows] = await pool.query(
      `SELECT id, email, senha_hash FROM usuarios
       WHERE ativo = TRUE
         AND (UPPER(nome_usuario) = ? OR UPPER(email) = ? OR cpf_hash = ?)
       ORDER BY id DESC`,
      [normalizeText(identifier), normalizeText(identifier), cpfHash],
    );

    const user = rows.find((item) => verifyPassword(senha_atual, item.senha_hash));
    if (!user) {
      throw createHttpError(401, "Senha atual incorreta.");
    }

    const normalizedAtual = String(email_atual).trim().toLowerCase();
    if (String(user.email || "").trim().toLowerCase() !== normalizedAtual) {
      throw createHttpError(400, "O e-mail atual informado não confere.");
    }

    const [existing] = await pool.query(
      "SELECT id FROM usuarios WHERE UPPER(email) = ? AND id != ? LIMIT 1",
      [normalizedNovo.toUpperCase(), user.id],
    );
    if (existing.length > 0) {
      throw createHttpError(409, "Este e-mail já está em uso por outro usuário.");
    }

    await pool.query("UPDATE usuarios SET email = ? WHERE id = ?", [normalizedNovo, user.id]);

    response.json({ data: { email_alterado: true, email: normalizedNovo } });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  login,
  requestPasswordRecovery,
  resetPassword,
  validatePasswordRecoveryCode,
  changePassword,
  changeEmail,
};
