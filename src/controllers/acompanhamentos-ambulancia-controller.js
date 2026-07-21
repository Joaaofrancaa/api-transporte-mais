const createCrudRepository = require("../repositories/crud-repository");
const resources = require("../resources/resource-definitions");
const createHttpError = require("../utils/http-error");
const { getCurrentLocalSqlDateTime } = require("../utils/datetime");
const { ensureFinalMileageGreaterThanInitial } = require("../utils/mileage");
const {
  ensureVehicleAvailableForAccept,
  updateVehicleSituationForAction,
} = require("../services/vehicle-fleet-service");

const repository = createCrudRepository(resources.acompanhamentosAmbulancia);
const driversRepository = createCrudRepository(resources.motoristas);
const TABLE_NAME = "acompanhamentos_ambulancia";

function getActionTimestamp() {
  return getCurrentLocalSqlDateTime();
}

function ensureSameInstitution(request, item) {
  if (request.authUser?.perfil === "MASTER") {
    throw createHttpError(403, "O ADM master não executa acompanhamentos.");
  }

  if (Number(item.instituicao_id) !== Number(request.authUser?.instituicao_id)) {
    throw createHttpError(403, "Acesso negado para esta instituição.");
  }
}

async function ensureDriverAllowed(request, motoristaId) {
  if (request.authUser?.perfil !== "MOTORISTA") {
    return;
  }

  if (!motoristaId) {
    throw createHttpError(400, "Informe o motorista responsável.");
  }

  const driver = await driversRepository.findById(motoristaId);

  if (!driver || Number(driver.instituicao_id) !== Number(request.authUser?.instituicao_id)) {
    throw createHttpError(403, "Motorista inválido para esta instituição.");
  }

  const sameUser = Number(driver.usuario_id) === Number(request.authUser.id);

  if (!sameUser) {
    throw createHttpError(403, "Motorista só pode assumir acompanhamentos do próprio acesso.");
  }
}

async function ensureDriverAvailableForAccept(request, motoristaId) {
  if (!motoristaId) {
    throw createHttpError(400, "Informe o motorista responsavel.");
  }

  const driver = await driversRepository.findById(motoristaId);

  if (!driver || Number(driver.instituicao_id) !== Number(request.authUser?.instituicao_id)) {
    throw createHttpError(403, "Motorista invalido para esta instituicao.");
  }

  if (driver.ativo === false || driver.ativo === 0 || driver.situacao === "INATIVO") {
    throw createHttpError(409, "Motorista esta inativo.");
  }
}

async function hasOtherOpenService(motoristaId, currentRecordId, institutionId) {
  const records = await repository.list({
    instituicao_id: institutionId,
    limit: 200,
  });

  return records.some(
    (record) =>
      Number(record.id) !== Number(currentRecordId) &&
      Number(record.motorista_id) === Number(motoristaId) &&
      ["ACEITO", "EM_ANDAMENTO"].includes(record.situacao),
  );
}

async function updateDriverSituationForAction(action, item, data) {
  if (action === "accept") {
    await driversRepository.update(data.motorista_id, { situacao: "EM_SERVICO" });
    return;
  }

  if (["finish", "release"].includes(action) && item.motorista_id) {
    const driver = await driversRepository.findById(item.motorista_id);

    if (!driver || driver.ativo === false || driver.ativo === 0 || driver.situacao === "INATIVO") {
      return;
    }

    const nextSituation = await hasOtherOpenService(
      item.motorista_id,
      item.id,
      item.instituicao_id,
    )
      ? "EM_SERVICO"
      : "DISPONIVEL";

    await driversRepository.update(item.motorista_id, { situacao: nextSituation });
  }
}

function ensureActionAllowed(request, item, action) {
  const profile = request.authUser?.perfil;

  ensureSameInstitution(request, item);

  if (profile === "ADMINISTRADOR") {
    return;
  }

  if (profile === "MOTORISTA" && ["accept", "start", "finish", "release"].includes(action)) {
    return;
  }

  throw createHttpError(403, "Acesso negado para alterar este acompanhamento.");
}

async function updateSituation(request, response, next, options) {
  try {
    const item = await repository.findById(request.params.id);

    if (!item) {
      throw createHttpError(404, "Acompanhamento não encontrado.");
    }

    ensureActionAllowed(request, item, options.action);

    const expectedSituations = Array.isArray(options.expectedSituation)
      ? options.expectedSituation
      : [options.expectedSituation];

    if (!expectedSituations.includes(item.situacao)) {
      throw createHttpError(
        409,
        `Acompanhamento precisa estar com situação ${expectedSituations.join(" ou ")}.`,
      );
    }

    if (options.action === "accept") {
      await ensureDriverAvailableForAccept(request, request.body?.motorista_id);
      await ensureDriverAllowed(request, request.body?.motorista_id);

      if (request.body?.veiculo_id) {
        await ensureVehicleAvailableForAccept(
          request,
          request.body.veiculo_id,
          item.id,
          TABLE_NAME,
          request.body.motorista_id,
        );
      }
    }

    if (["start", "finish", "release"].includes(options.action)) {
      await ensureDriverAllowed(request, item.motorista_id);
    }

    const data = options.data(request.body || {}, item);

    if (options.action === "finish") {
      ensureFinalMileageGreaterThanInitial(item.quilometragem_inicial, data.quilometragem_final);
    }

    if (data.retorno_em && item.saida_em) {
      const returnDate = new Date(String(data.retorno_em).replace(" ", "T"));
      const departureDate = new Date(item.saida_em);

      if (!Number.isNaN(returnDate.getTime()) && !Number.isNaN(departureDate.getTime()) && returnDate < departureDate) {
        throw createHttpError(
          409,
          "O horário de retorno não pode ser anterior ao horário de saída agendado.",
        );
      }
    }

    const updatedItem = await repository.update(request.params.id, {
      ...data,
      situacao: options.nextSituation,
    });
    await updateDriverSituationForAction(options.action, item, data);
    await updateVehicleSituationForAction(options.action, item, data, TABLE_NAME);

    response.json({ data: updatedItem });
  } catch (error) {
    next(error);
  }
}

function accept(request, response, next) {
  return updateSituation(request, response, next, {
    action: "accept",
    expectedSituation: "AGENDADO",
    nextSituation: "ACEITO",
    data: (body) => ({
      aceito_em: getActionTimestamp(),
      motorista_id: body.motorista_id,
      veiculo_id: body.veiculo_id || null,
    }),
  });
}

function start(request, response, next) {
  return updateSituation(request, response, next, {
    action: "start",
    expectedSituation: "ACEITO",
    nextSituation: "EM_ANDAMENTO",
    data: (body) => ({
      iniciado_em: getActionTimestamp(),
      quilometragem_inicial: body.quilometragem_inicial,
    }),
  });
}

function finish(request, response, next) {
  return updateSituation(request, response, next, {
    action: "finish",
    expectedSituation: "EM_ANDAMENTO",
    nextSituation: "CONCLUIDO",
    data: (body) => ({
      finalizado_em: getActionTimestamp(),
      retorno_em: body.retorno_em || getActionTimestamp(),
      quilometragem_final: body.quilometragem_final,
      modo_espera: body.modo_espera || null,
    }),
  });
}

function release(request, response, next) {
  return updateSituation(request, response, next, {
    action: "release",
    expectedSituation: ["ACEITO", "EM_ANDAMENTO"],
    nextSituation: "AGENDADO",
    data: () => ({
      motorista_id: null,
      veiculo_id: null,
      aceito_em: null,
      iniciado_em: null,
    }),
  });
}

module.exports = {
  accept,
  finish,
  release,
  start,
};
