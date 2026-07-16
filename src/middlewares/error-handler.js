const env = require("../config/env");

function getDuplicateEntryMessage(error) {
  const duplicateKey = String(error.sqlMessage || error.message || "");

  if (duplicateKey.includes("uk_usuarios_email") || duplicateKey.includes("uk_usuarios_instituicao_email")) {
    return "Este e-mail já está cadastrado nesta instituição.";
  }

  if (duplicateKey.includes("uk_usuarios_cpf") || duplicateKey.includes("uk_usuarios_instituicao_cpf")) {
    return "Este CPF já está cadastrado nesta instituição.";
  }

  if (duplicateKey.includes("uk_usuarios_nome_usuario") || duplicateKey.includes("uk_usuarios_instituicao_nome_usuario")) {
    return "Este nome de usuário já está cadastrado nesta instituição.";
  }

  if (duplicateKey.includes("uk_setores_nome")) {
    return "Este setor já está cadastrado.";
  }

  if (duplicateKey.includes("uk_unidades_nome")) {
    return "Esta unidade já está cadastrada.";
  }

  if (duplicateKey.includes("uk_medicos_nome")) {
    return "Este médico já está cadastrado.";
  }

  if (duplicateKey.includes("uk_acompanhantes_nome_tipo")) {
    return "Este acompanhante já está cadastrado com esse tipo.";
  }

  return "Já existe um cadastro com essas informações.";
}

function getCheckConstraintMessage(error) {
  const constraint = String(error.sqlMessage || error.message || "");

  if (constraint.includes("ck_solicitacoes_quilometragem") || constraint.includes("quilometragem")) {
    return "A quilometragem final deve ser maior que a quilometragem inicial.";
  }

  if (constraint.includes("ck_acompanhamentos_periodo")) {
    return "O horário de retorno não pode ser anterior ao horário de saída.";
  }

  if (constraint.includes("ck_solicitacoes_periodo")) {
    return "O horário de retorno não pode ser anterior ao horário de saída.";
  }

  return "Não foi possível salvar: os dados informados não são válidos.";
}

function errorHandler(error, _request, response, _next) {
  const isDuplicateEntry = error.code === "ER_DUP_ENTRY";
  const isForeignKeyError =
    error.code === "ER_NO_REFERENCED_ROW_2" ||
    error.code === "ER_ROW_IS_REFERENCED_2";
  const isCheckConstraintError = error.code === "ER_CHECK_CONSTRAINT_VIOLATED";
  const statusCode =
    error.statusCode ||
    (isDuplicateEntry || isForeignKeyError || isCheckConstraintError ? 400 : 500);

  if (statusCode >= 500) {
    console.error(error);
  }

  let publicMessage =
    error.publicMessage ||
    (statusCode >= 500 ? "Erro interno do servidor." : error.message);

  if (isDuplicateEntry) {
    publicMessage = getDuplicateEntryMessage(error);
  }

  if (isForeignKeyError) {
    publicMessage = "Não foi possível salvar porque há vínculos inválidos no cadastro.";
  }

  if (isCheckConstraintError) {
    publicMessage = getCheckConstraintMessage(error);
  }

  const body = {
    error: publicMessage,
  };

  if (!env.isProduction && statusCode >= 500) {
    body.details = error.message;
  }

  response.status(statusCode).json(body);
}

module.exports = errorHandler;
