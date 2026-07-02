const mysql = require("mysql2/promise");
const env = require("../src/config/env");
const { hashPassword } = require("../src/utils/password-hash");
const { encryptCpf, hashCpfDigits } = require("../src/utils/cpf-crypto");

const TEST_INSTITUTION_NAME = "Instituicao Teste";
const TEST_PASSWORD = "123456";

const TEST_USERS = [
  {
    nome: "Kengi Administrador Teste",
    nome_usuario: "KENGI",
    cpf: "111.111.111-11",
    email: "kengi.teste@transporte.local",
    telefone: "(14) 00000-0011",
    perfil: "ADMINISTRADOR",
  },
  {
    nome: "Joao Solicitante Teste",
    nome_usuario: "JOAO",
    cpf: "222.222.222-22",
    email: "joao.teste@transporte.local",
    telefone: "(14) 00000-0022",
    perfil: "SOLICITANTE",
  },
];

async function ensureTestInstitution(connection) {
  const [rows] = await connection.query(
    "SELECT id FROM instituicoes WHERE nome = ?",
    [TEST_INSTITUTION_NAME],
  );

  if (rows[0]) {
    return rows[0].id;
  }

  const [result] = await connection.query(
    "INSERT INTO instituicoes (nome, usa_acompanhamento, ativo) VALUES (?, TRUE, TRUE)",
    [TEST_INSTITUTION_NAME],
  );

  console.log(`Instituicao "${TEST_INSTITUTION_NAME}" criada (id ${result.insertId}).`);
  return result.insertId;
}

async function ensureTestUser(connection, instituicaoId, user) {
  const [rows] = await connection.query(
    "SELECT id FROM usuarios WHERE instituicao_id = ? AND nome_usuario = ?",
    [instituicaoId, user.nome_usuario],
  );

  if (rows[0]) {
    console.log(`Usuario ${user.nome_usuario} ja existe (id ${rows[0].id}).`);
    return;
  }

  const [result] = await connection.query(
    `
      INSERT INTO usuarios
        (instituicao_id, nome, nome_usuario, cpf, cpf_hash, email, telefone, perfil, senha_hash, ativo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
    `,
    [
      instituicaoId,
      user.nome,
      user.nome_usuario,
      encryptCpf(user.cpf),
      hashCpfDigits(user.cpf),
      user.email,
      user.telefone,
      user.perfil,
      hashPassword(TEST_PASSWORD),
    ],
  );

  console.log(`Usuario ${user.nome_usuario} criado (id ${result.insertId}).`);
}

async function main() {
  const connection = await mysql.createConnection({
    host: env.database.host,
    port: env.database.port,
    user: env.database.user,
    password: env.database.password,
    database: env.database.name,
  });

  try {
    const instituicaoId = await ensureTestInstitution(connection);

    for (const user of TEST_USERS) {
      await ensureTestUser(connection, instituicaoId, user);
    }
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
