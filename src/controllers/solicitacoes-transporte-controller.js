const createCrudRepository = require("../repositories/crud-repository");
const resources = require("../resources/resource-definitions");
const createHttpError = require("../utils/http-error");

const repository = createCrudRepository(resources.solicitacoesTransporte);
const driversRepository = createCrudRepository(resources.motoristas);

function getActionTimestamp() {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
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

  if (profile === "MOTORISTA" && ["accept", "start", "finish"].includes(action)) {
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

    if (item.situacao !== options.expectedSituation) {
      throw createHttpError(
        409,
        `Solicitação precisa estar com situação ${options.expectedSituation}.`,
      );
    }

    if (options.action === "accept") {
      await ensureDriverAllowed(request, request.body?.motorista_id);
    }

    if (["start", "finish"].includes(options.action)) {
      await ensureDriverAllowed(request, item.motorista_id);
    }

    const updatedItem = await repository.update(request.params.id, {
      ...options.data(request.body || {}, item),
      situacao: options.nextSituation,
    });

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

module.exports = {
  accept,
  cancel,
  finish,
  start,
};
