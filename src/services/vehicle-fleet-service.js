const createCrudRepository = require("../repositories/crud-repository");
const resources = require("../resources/resource-definitions");
const createHttpError = require("../utils/http-error");

const vehiclesRepository = createCrudRepository(resources.veiculos);
const solicitacoesRepository = createCrudRepository(resources.solicitacoesTransporte);
const acompanhamentosRepository = createCrudRepository(resources.acompanhamentosAmbulancia);

async function hasOtherOpenServiceForVehicle(veiculoId, currentRecordId, currentTable, institutionId) {
  const [requests, trackingRecords] = await Promise.all([
    solicitacoesRepository.list({ instituicao_id: institutionId, limit: 200 }),
    acompanhamentosRepository.list({ instituicao_id: institutionId, limit: 200 }),
  ]);

  const hasOpenRequest = requests.some(
    (request) =>
      !(currentTable === "solicitacoes_transporte" && Number(request.id) === Number(currentRecordId)) &&
      Number(request.veiculo_id) === Number(veiculoId) &&
      ["ACEITA", "EM_ANDAMENTO"].includes(request.situacao),
  );

  if (hasOpenRequest) {
    return true;
  }

  return trackingRecords.some(
    (record) =>
      !(currentTable === "acompanhamentos_ambulancia" && Number(record.id) === Number(currentRecordId)) &&
      Number(record.veiculo_id) === Number(veiculoId) &&
      ["ACEITO", "EM_ANDAMENTO"].includes(record.situacao),
  );
}

async function ensureVehicleAvailableForAccept(request, veiculoId, currentRecordId, currentTable) {
  const vehicle = await vehiclesRepository.findById(veiculoId);

  if (!vehicle || Number(vehicle.instituicao_id) !== Number(request.authUser?.instituicao_id)) {
    throw createHttpError(403, "Veículo inválido para esta instituição.");
  }

  if (vehicle.ativo === false || vehicle.ativo === 0 || vehicle.situacao === "INATIVO") {
    throw createHttpError(409, "Veículo está inativo.");
  }

  const inUse = await hasOtherOpenServiceForVehicle(
    veiculoId,
    currentRecordId,
    currentTable,
    request.authUser?.instituicao_id,
  );

  if (inUse) {
    throw createHttpError(409, "Este veículo já está em outro atendimento em andamento.");
  }
}

async function updateVehicleSituationForAction(action, item, data, currentTable) {
  if (action === "accept") {
    if (data.veiculo_id) {
      await vehiclesRepository.update(data.veiculo_id, { situacao: "EM_SERVICO" });
    }
    return;
  }

  if (["finish", "release"].includes(action) && item.veiculo_id) {
    const vehicle = await vehiclesRepository.findById(item.veiculo_id);

    if (!vehicle || vehicle.ativo === false || vehicle.ativo === 0 || vehicle.situacao === "INATIVO") {
      return;
    }

    const nextSituation = await hasOtherOpenServiceForVehicle(
      item.veiculo_id,
      item.id,
      currentTable,
      item.instituicao_id,
    )
      ? "EM_SERVICO"
      : "DISPONIVEL";

    const updateData = { situacao: nextSituation };

    if (action === "finish" && data.quilometragem_final != null) {
      updateData.quilometragem_atual = data.quilometragem_final;
    }

    await vehiclesRepository.update(item.veiculo_id, updateData);
  }
}

module.exports = {
  ensureVehicleAvailableForAccept,
  updateVehicleSituationForAction,
};
