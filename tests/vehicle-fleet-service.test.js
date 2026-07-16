const assert = require("node:assert/strict");
const test = require("node:test");

function loadServiceWithRepositories(state) {
  const crudRepositoryPath = require.resolve("../src/repositories/crud-repository");
  const servicePath = require.resolve("../src/services/vehicle-fleet-service");
  const originalCrudRepository = require.cache[crudRepositoryPath];

  delete require.cache[servicePath];
  require.cache[crudRepositoryPath] = {
    id: crudRepositoryPath,
    filename: crudRepositoryPath,
    loaded: true,
    exports: (resource) => {
      if (resource.tableName === "veiculos") {
        return {
          findById: async (id) => state.vehicles.find((vehicle) => Number(vehicle.id) === Number(id)) || null,
          update: async (id, data) => {
            state.vehicleUpdates.push({ id, data });
            return { id, ...data };
          },
        };
      }

      if (resource.tableName === "solicitacoes_transporte") {
        return {
          list: async () => state.requests,
        };
      }

      if (resource.tableName === "acompanhamentos_ambulancia") {
        return {
          list: async () => state.trackingRecords,
        };
      }

      throw new Error(`Repositorio nao mockado: ${resource.tableName}`);
    },
  };

  const service = require("../src/services/vehicle-fleet-service");

  delete require.cache[servicePath];

  if (originalCrudRepository) {
    require.cache[crudRepositoryPath] = originalCrudRepository;
  } else {
    delete require.cache[crudRepositoryPath];
  }

  return service;
}

function createState(overrides = {}) {
  return {
    vehicles: [{ id: 10, instituicao_id: 1, ativo: true, situacao: "EM_SERVICO" }],
    requests: [],
    trackingRecords: [],
    vehicleUpdates: [],
    ...overrides,
  };
}

test("permite aceitar outro atendimento com o mesmo veiculo quando o motorista e o mesmo", async () => {
  const state = createState({
    requests: [
      { id: 20, instituicao_id: 1, veiculo_id: 10, motorista_id: 7, situacao: "EM_ANDAMENTO" },
    ],
  });
  const { ensureVehicleAvailableForAccept } = loadServiceWithRepositories(state);

  await assert.doesNotReject(() =>
    ensureVehicleAvailableForAccept(
      { authUser: { instituicao_id: 1 } },
      10,
      21,
      "solicitacoes_transporte",
      7,
    ),
  );
});

test("bloqueia aceitar atendimento com veiculo em uso por outro motorista", async () => {
  const state = createState({
    requests: [
      { id: 20, instituicao_id: 1, veiculo_id: 10, motorista_id: 7, situacao: "EM_ANDAMENTO" },
    ],
  });
  const { ensureVehicleAvailableForAccept } = loadServiceWithRepositories(state);

  await assert.rejects(
    () =>
      ensureVehicleAvailableForAccept(
        { authUser: { instituicao_id: 1 } },
        10,
        21,
        "solicitacoes_transporte",
        8,
      ),
    (error) => {
      assert.equal(error.statusCode, 409);
      assert.equal(error.publicMessage, "Este veículo já está em outro atendimento em andamento.");
      return true;
    },
  );
});

test("nao reduz a quilometragem atual do veiculo ao finalizar atendimento antigo", async () => {
  const state = createState({
    vehicles: [{ id: 10, instituicao_id: 1, ativo: true, situacao: "EM_SERVICO", quilometragem_atual: 802000 }],
  });
  const { updateVehicleSituationForAction } = loadServiceWithRepositories(state);

  await updateVehicleSituationForAction(
    "finish",
    { id: 21, instituicao_id: 1, veiculo_id: 10 },
    { quilometragem_final: 801000 },
    "solicitacoes_transporte",
  );

  assert.equal(state.vehicleUpdates.length, 1);
  assert.deepEqual(state.vehicleUpdates[0], {
    id: 10,
    data: { situacao: "DISPONIVEL", quilometragem_atual: 802000 },
  });
});

test("atualiza a quilometragem atual do veiculo quando a finalizacao e maior", async () => {
  const state = createState({
    vehicles: [{ id: 10, instituicao_id: 1, ativo: true, situacao: "EM_SERVICO", quilometragem_atual: 801000 }],
  });
  const { updateVehicleSituationForAction } = loadServiceWithRepositories(state);

  await updateVehicleSituationForAction(
    "finish",
    { id: 21, instituicao_id: 1, veiculo_id: 10 },
    { quilometragem_final: 802000 },
    "solicitacoes_transporte",
  );

  assert.equal(state.vehicleUpdates.length, 1);
  assert.deepEqual(state.vehicleUpdates[0], {
    id: 10,
    data: { situacao: "DISPONIVEL", quilometragem_atual: 802000 },
  });
});
