const assert = require("node:assert/strict");
const test = require("node:test");

const createApp = require("../src/app");
const { closeDatabasePool } = require("../src/database/connection");

const ADMIN_LOGIN = process.env.TEST_ADMIN_LOGIN || "KENGI";
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || "123456";
const REQUESTER_LOGIN = process.env.TEST_REQUESTER_LOGIN || "JOAO";
const REQUESTER_PASSWORD = process.env.TEST_REQUESTER_PASSWORD || "123456";

let server;
let baseUrl;

function request(path, options = {}) {
  return fetch(`${baseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });
}

async function readJson(response) {
  return response.json().catch(() => ({}));
}

async function login(identifier, password) {
  const response = await request("/api/v1/autenticacao/entrar", {
    method: "POST",
    body: JSON.stringify({ identifier, password }),
  });
  const payload = await readJson(response);

  assert.equal(response.status, 200, payload.error || `Falha no login de ${identifier}`);
  assert.ok(payload.data?.token, `Login de ${identifier} deve retornar token.`);

  return payload.data;
}

test.before(async () => {
  const app = createApp();

  server = await new Promise((resolve) => {
    const listener = app.listen(0, () => resolve(listener));
  });

  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await closeDatabasePool();
});

test("rotas de dados exigem token", async () => {
  const response = await request("/api/v1/usuarios?limit=200");
  const payload = await readJson(response);

  assert.equal(response.status, 401);
  assert.equal(payload.error, "Sessão obrigatória. Entre novamente.");
});

test("login retorna token e permite ler dados da própria instituição", async () => {
  const user = await login(REQUESTER_LOGIN, REQUESTER_PASSWORD);
  const response = await request(
    `/api/v1/usuarios?limit=200&instituicao_id=${user.instituicao_id}`,
    { token: user.token },
  );
  const payload = await readJson(response);

  assert.equal(response.status, 200, payload.error);
  assert.ok(Array.isArray(payload.data));
  assert.ok(payload.data.every((item) => Number(item.instituicao_id) === Number(user.instituicao_id)));
});

test("administrador não escapa para outra instituição pela query", async () => {
  const admin = await login(ADMIN_LOGIN, ADMIN_PASSWORD);
  const anotherInstitutionId = Number(admin.instituicao_id) === 3 ? 2 : 3;
  const response = await request(
    `/api/v1/usuarios?limit=200&instituicao_id=${anotherInstitutionId}`,
    { token: admin.token },
  );
  const payload = await readJson(response);

  assert.equal(response.status, 200, payload.error);
  assert.ok(payload.data.every((item) => Number(item.instituicao_id) === Number(admin.instituicao_id)));
});

test("administrador não cadastra outro administrador", async () => {
  const admin = await login(ADMIN_LOGIN, ADMIN_PASSWORD);
  const response = await request("/api/v1/usuarios", {
    method: "POST",
    token: admin.token,
    body: JSON.stringify({
      instituicao_id: admin.instituicao_id,
      nome: "TESTE ADMIN BLOQUEADO",
      nome_usuario: `TESTE.ADMIN.${Date.now()}`,
      cpf: "000.000.000-90",
      email: `teste.admin.${Date.now()}@example.com`,
      perfil: "ADMINISTRADOR",
      senha_hash: "123456",
      ativo: true,
    }),
  });
  const payload = await readJson(response);

  assert.equal(response.status, 403);
  assert.equal(payload.error, "O administrador só pode cadastrar solicitantes e motoristas.");
});

test("solicitante não gerencia usuários", async () => {
  const requester = await login(REQUESTER_LOGIN, REQUESTER_PASSWORD);
  const response = await request("/api/v1/usuarios", {
    method: "POST",
    token: requester.token,
    body: JSON.stringify({
      nome: "TESTE SOLICITANTE BLOQUEADO",
      nome_usuario: `TESTE.SOLICITANTE.${Date.now()}`,
      cpf: "000.000.000-91",
      email: `teste.solicitante.${Date.now()}@example.com`,
      perfil: "SOLICITANTE",
      senha_hash: "123456",
      ativo: true,
    }),
  });
  const payload = await readJson(response);

  assert.equal(response.status, 403);
  assert.equal(payload.error, "Acesso negado para gerenciar usuários.");
});
