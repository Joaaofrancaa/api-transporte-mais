const { sendSupportTicketEmail } = require("./support-ticket-hooks");
const { getDatabasePool } = require("../database/connection");
const {
  scheduleNewTransportRequestNotification,
} = require("../services/push-notifications");
const createHttpError = require("../utils/http-error");
const { hashPasswordField } = require("../utils/password-hash");

function normalizeUserData(data) {
  if (["ADMINISTRADOR", "MASTER"].includes(data.perfil)) {
    return {
      ...data,
      setor_id: null,
    };
  }

  return data;
}

function prepareUserData(data) {
  return hashPasswordField(normalizeUserData(data));
}

async function ensureInstitutionUsesTracking(data) {
  if (!data.instituicao_id) {
    return data;
  }

  const pool = getDatabasePool();
  const [rows] = await pool.query(
    "SELECT usa_acompanhamento FROM instituicoes WHERE id = ? LIMIT 1",
    [data.instituicao_id],
  );

  if (rows[0] && rows[0].usa_acompanhamento === 0) {
    throw createHttpError(403, "Esta instituição não usa acompanhamentos.");
  }

  return data;
}

const editableSolicitacaoFields = new Set([
  "setor_origem_id",
  "tipo",
  "nome_paciente",
  "nome_destino",
  "endereco_destino",
  "numero_destino",
  "latitude_destino",
  "longitude_destino",
  "consulta_rota_destino",
  "agendado_para",
  "prioridade",
  "observacoes_solicitante",
]);

function prepareSolicitacaoUpdate(data, { currentItem, request }) {
  if (currentItem.situacao !== "PENDENTE") {
    throw createHttpError(
      409,
      "Só é possível editar solicitações que ainda não foram aceitas pelo motorista.",
    );
  }

  if (
    request.authUser?.perfil === "SOLICITANTE" &&
    Number(currentItem.solicitante_usuario_id) !== Number(request.authUser.id)
  ) {
    throw createHttpError(403, "Solicitante só pode editar a própria solicitação.");
  }

  return Object.fromEntries(
    Object.entries(data).filter(([column]) => editableSolicitacaoFields.has(column)),
  );
}

const resources = {
  instituicoes: {
    route: "instituicoes",
    tableName: "instituicoes",
    searchableColumns: ["nome", "cnpj"],
    writableColumns: ["nome", "cnpj", "usa_acompanhamento", "ativo"],
    requiredOnCreate: ["nome"],
  },
  usuarios: {
    route: "usuarios",
    tableName: "usuarios",
    tenantColumn: "instituicao_id",
    searchableColumns: ["nome", "nome_usuario", "cpf", "email"],
    writableColumns: [
      "instituicao_id",
      "setor_id",
      "nome",
      "nome_usuario",
      "cpf",
      "email",
      "telefone",
      "perfil",
      "senha_hash",
      "ativo",
    ],
    requiredOnCreate: [
      "instituicao_id",
      "nome",
      "nome_usuario",
      "cpf",
      "email",
      "perfil",
      "senha_hash",
    ],
    hiddenColumns: ["senha_hash"],
    beforeCreate: prepareUserData,
    beforeUpdate: prepareUserData,
  },
  motoristas: {
    route: "motoristas",
    tableName: "motoristas",
    tenantColumn: "instituicao_id",
    searchableColumns: ["nome", "cpf", "numero_cnh"],
    writableColumns: [
      "instituicao_id",
      "usuario_id",
      "nome",
      "cpf",
      "numero_cnh",
      "categoria_cnh",
      "validade_cnh",
      "telefone",
      "situacao",
      "ativo",
    ],
    requiredOnCreate: [
      "instituicao_id",
      "nome",
      "cpf",
      "numero_cnh",
      "categoria_cnh",
      "validade_cnh",
    ],
  },
  setores: {
    route: "setores",
    tableName: "setores",
    tenantColumn: "instituicao_id",
    searchableColumns: ["nome"],
    writableColumns: ["instituicao_id", "nome", "ativo"],
    requiredOnCreate: ["instituicao_id", "nome"],
  },
  unidades: {
    route: "unidades",
    tableName: "unidades",
    tenantColumn: "instituicao_id",
    searchableColumns: ["nome"],
    writableColumns: ["instituicao_id", "nome", "ativo"],
    requiredOnCreate: ["instituicao_id", "nome"],
  },
  medicos: {
    route: "medicos",
    tableName: "medicos",
    tenantColumn: "instituicao_id",
    searchableColumns: ["nome"],
    writableColumns: ["instituicao_id", "nome", "ativo"],
    requiredOnCreate: ["instituicao_id", "nome"],
  },
  acompanhantes: {
    route: "acompanhantes",
    tableName: "acompanhantes",
    tenantColumn: "instituicao_id",
    searchableColumns: ["nome", "tipo"],
    writableColumns: ["instituicao_id", "nome", "tipo", "ativo"],
    requiredOnCreate: ["instituicao_id", "nome", "tipo"],
  },
  destinosFavoritos: {
    route: "destinos-favoritos",
    tableName: "destinos_favoritos",
    tenantColumn: "instituicao_id",
    searchableColumns: ["nome", "endereco_destino"],
    writableColumns: [
      "instituicao_id",
      "usuario_id",
      "nome",
      "endereco_destino",
      "numero_destino",
      "latitude",
      "longitude",
      "consulta_rota",
    ],
    requiredOnCreate: ["instituicao_id", "usuario_id", "nome", "endereco_destino"],
  },
  chamadosSuporte: {
    route: "chamados-suporte",
    tableName: "chamados_suporte",
    tenantColumn: "instituicao_id",
    searchableColumns: ["nome_usuario", "email_usuario", "assunto", "mensagem", "situacao"],
    writableColumns: [
      "instituicao_id",
      "usuario_id",
      "nome_usuario",
      "email_usuario",
      "assunto",
      "mensagem",
      "situacao",
    ],
    requiredOnCreate: ["assunto", "mensagem"],
    afterCreate: sendSupportTicketEmail,
  },
  solicitacoesTransporte: {
    route: "solicitacoes-transporte",
    tableName: "solicitacoes_transporte",
    tenantColumn: "instituicao_id",
    searchableColumns: ["nome_paciente", "nome_destino", "endereco_destino"],
    filterableColumns: [
      "solicitante_usuario_id",
      "setor_origem_id",
      "motorista_id",
      "tipo",
      "agendado_para",
      "prioridade",
      "situacao",
    ],
    writableColumns: [
      "instituicao_id",
      "solicitante_usuario_id",
      "setor_origem_id",
      "motorista_id",
      "tipo",
      "nome_paciente",
      "nome_destino",
      "endereco_destino",
      "numero_destino",
      "latitude_destino",
      "longitude_destino",
      "consulta_rota_destino",
      "agendado_para",
      "prioridade",
      "situacao",
      "observacoes_solicitante",
      "aceito_em",
      "iniciado_em",
      "finalizado_em",
      "cancelado_em",
      "saida_em",
      "retorno_em",
      "quilometragem_inicial",
      "quilometragem_final",
      "observacoes_atendimento",
    ],
    requiredOnCreate: [
      "instituicao_id",
      "solicitante_usuario_id",
      "setor_origem_id",
      "tipo",
      "nome_destino",
      "endereco_destino",
      "agendado_para",
      "prioridade",
    ],
    beforeUpdate: prepareSolicitacaoUpdate,
    afterCreate: scheduleNewTransportRequestNotification,
  },
  acompanhamentosAmbulancia: {
    route: "acompanhamentos-ambulancia",
    tableName: "acompanhamentos_ambulancia",
    tenantColumn: "instituicao_id",
    searchableColumns: ["nome_paciente", "nome_destino", "endereco_destino"],
    writableColumns: [
      "instituicao_id",
      "unidade_id",
      "setor_id",
      "medico_id",
      "acompanhante_id",
      "motorista_id",
      "tipo",
      "nome_paciente",
      "quarto",
      "nome_destino",
      "endereco_destino",
      "numero_destino",
      "nome_medico_historico",
      "nome_acompanhante_historico",
      "tipo_acompanhante_historico",
      "nome_motorista_historico",
      "saida_em",
      "retorno_em",
      "situacao",
      "observacoes",
    ],
    requiredOnCreate: [
      "instituicao_id",
      "unidade_id",
      "setor_id",
      "tipo",
      "nome_paciente",
      "quarto",
      "nome_destino",
      "endereco_destino",
      "nome_acompanhante_historico",
      "tipo_acompanhante_historico",
      "nome_motorista_historico",
      "saida_em",
      "retorno_em",
    ],
    beforeCreate: ensureInstitutionUsesTracking,
    beforeUpdate: ensureInstitutionUsesTracking,
  },
};

module.exports = resources;
