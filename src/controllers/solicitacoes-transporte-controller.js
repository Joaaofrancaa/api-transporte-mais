const createCrudRepository = require("../repositories/crud-repository");
const resources = require("../resources/resource-definitions");
const createHttpError = require("../utils/http-error");

const repository = createCrudRepository(resources.solicitacoesTransporte);

function getActionTimestamp() {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

async function updateSituation(request, response, next, options) {
  try {
    const item = await repository.findById(request.params.id);

    if (!item) {
      throw createHttpError(404, "Solicitação não encontrada.");
    }

    if (item.situacao !== options.expectedSituation) {
      throw createHttpError(
        409,
        `Solicitação precisa estar com situação ${options.expectedSituation}.`,
      );
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
    expectedSituation: "PENDENTE",
    nextSituation: "CANCELADA",
    data: () => ({ cancelado_em: getActionTimestamp() }),
  });
}

function accept(request, response, next) {
  return updateSituation(request, response, next, {
    expectedSituation: "PENDENTE",
    nextSituation: "ACEITA",
    data: (body) => ({
      aceito_em: getActionTimestamp(),
      motorista_id: body.motorista_id,
      veiculo_id: body.veiculo_id,
    }),
  });
}

function start(request, response, next) {
  return updateSituation(request, response, next, {
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
