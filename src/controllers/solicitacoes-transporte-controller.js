const createCrudRepository = require("../repositories/crud-repository");
const resources = require("../resources/resource-definitions");
const createHttpError = require("../utils/http-error");
const { getCurrentLocalSqlDateTime } = require("../utils/datetime");

const repository = createCrudRepository(resources.solicitacoesTransporte);
const driversRepository = createCrudRepository(resources.motoristas);

function getActionTimestamp() {
  return getCurrentLocalSqlDateTime();
}

function ensureSameInstitution(request, item) {
  if (request.authUser?.perfil === "MASTER") {
    throw createHttpError(403, "O ADM master não executa solicitações de transporte.");
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
    throw createHttpError(403, "Motorista só pode assumir solicitações do próprio acesso.");
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

async function hasOtherOpenService(motoristaId, currentRequestId, institutionId) {
  const requests = await repository.list({
    instituicao_id: institutionId,
    limit: 200,
  });

  return requests.some(
    (request) =>
      Number(request.id) !== Number(currentRequestId) &&
      Number(request.motorista_id) === Number(motoristaId) &&
      ["ACEITA", "EM_ANDAMENTO"].includes(request.situacao),
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

  if (profile === "SOLICITANTE" && action === "cancel") {
    if (Number(item.solicitante_usuario_id) !== Number(request.authUser.id)) {
      throw createHttpError(403, "Solicitante só pode cancelar a própria solicitação.");
    }

    return;
  }

  if (profile === "MOTORISTA" && ["accept", "start", "finish", "release"].includes(action)) {
    return;
  }

  throw createHttpError(403, "Acesso negado para alterar esta solicitação.");
}

async function updateSituation(request, response, next, options) {
  try {
    const item = await repository.findById(request.params.id);

    if (!item) {
      throw createHttpError(404, "Solicitação não encontrada.");
    }

    ensureActionAllowed(request, item, options.action);

    const expectedSituations = Array.isArray(options.expectedSituation)
      ? options.expectedSituation
      : [options.expectedSituation];

    if (!expectedSituations.includes(item.situacao)) {
      throw createHttpError(
        409,
        `Solicitação precisa estar com situação ${expectedSituations.join(" ou ")}.`,
      );
    }

    if (options.action === "accept") {
      await ensureDriverAvailableForAccept(request, request.body?.motorista_id);
      await ensureDriverAllowed(request, request.body?.motorista_id);
    }

    if (["start", "finish", "release"].includes(options.action)) {
      await ensureDriverAllowed(request, item.motorista_id);
    }

    const data = options.data(request.body || {}, item);
    const updatedItem = await repository.update(request.params.id, {
      ...data,
      situacao: options.nextSituation,
    });
    await updateDriverSituationForAction(options.action, item, data);

    response.json({ data: updatedItem });
  } catch (error) {
    next(error);
  }
}

function cancel(request, response, next) {
  return updateSituation(request, response, next, {
    action: "cancel",
    expectedSituation: "PENDENTE",
    nextSituation: "CANCELADA",
    data: () => ({ cancelado_em: getActionTimestamp() }),
  });
}

function accept(request, response, next) {
  return updateSituation(request, response, next, {
    action: "accept",
    expectedSituation: "PENDENTE",
    nextSituation: "ACEITA",
    data: (body) => ({
      aceito_em: getActionTimestamp(),
      motorista_id: body.motorista_id,
    }),
  });
}

function start(request, response, next) {
  return updateSituation(request, response, next, {
    action: "start",
    expectedSituation: "ACEITA",
    nextSituation: "EM_ANDAMENTO",
    data: (body) => ({
      iniciado_em: getActionTimestamp(),
      saida_em: body.saida_em,
      quilometragem_inicial: body.quilometragem_inicial,
      observacoes_atendimento: body.observacoes_atendimento,
    }),
  });
}

function finish(request, response, next) {
  return updateSituation(request, response, next, {
    action: "finish",
    expectedSituation: "EM_ANDAMENTO",
    nextSituation: "CONCLUIDA",
    data: (body) => ({
      finalizado_em: getActionTimestamp(),
      retorno_em: body.retorno_em,
      quilometragem_final: body.quilometragem_final,
      observacoes_atendimento: body.observacoes_atendimento,
    }),
  });
}

function release(request, response, next) {
  return updateSituation(request, response, next, {
    action: "release",
    expectedSituation: ["ACEITA", "EM_ANDAMENTO"],
    nextSituation: "PENDENTE",
    data: () => ({
      motorista_id: null,
      aceito_em: null,
      iniciado_em: null,
      saida_em: null,
      quilometragem_inicial: null,
      observacoes_atendimento: null,
    }),
  });
}

module.exports = {
  accept,
  cancel,
  finish,
  release,
  start,
};
