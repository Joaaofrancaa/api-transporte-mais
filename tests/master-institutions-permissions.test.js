const assert = require("node:assert/strict");
const test = require("node:test");

const createResourceController = require("../src/controllers/resource-controller-factory");

const institutionDefinition = {
  route: "instituicoes",
  writableColumns: ["nome"],
  requiredOnCreate: ["nome"],
};

function createResponse() {
  return {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };
}

test("MASTER pode cadastrar instituição", async () => {
  const repository = {
    async create(data) {
      return { id: 10, ...data };
    },
  };
  const controller = createResourceController(repository, institutionDefinition);
  const response = createResponse();
  let nextError;

  await controller.create(
    { authUser: { perfil: "MASTER" }, body: { nome: "Nova instituição" } },
    response,
    (error) => {
      nextError = error;
    },
  );

  assert.equal(nextError, undefined);
  assert.equal(response.statusCode, 201);
  assert.deepEqual(response.payload, {
    data: { id: 10, nome: "Nova instituição" },
  });
});

test("ADMINISTRADOR não pode cadastrar instituição", async () => {
  let createCalled = false;
  const repository = {
    async create() {
      createCalled = true;
    },
  };
  const controller = createResourceController(repository, institutionDefinition);
  const response = createResponse();
  let nextError;

  await controller.create(
    { authUser: { perfil: "ADMINISTRADOR" }, body: { nome: "Bloqueada" } },
    response,
    (error) => {
      nextError = error;
    },
  );

  assert.equal(createCalled, false);
  assert.equal(nextError?.statusCode, 403);
  assert.equal(nextError?.message, "O administrador não pode gerenciar instituições.");
});
