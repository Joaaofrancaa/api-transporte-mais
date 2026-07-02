const { getDatabasePool } = require("../database/connection");
const createHttpError = require("../utils/http-error");

const driverOpenRequestSituations = ["EM_ANDAMENTO", "ACEITA"];

function pickWritableData(body, writableColumns) {
  return writableColumns.reduce((data, column) => {
    if (Object.prototype.hasOwnProperty.call(body, column)) {
      data[column] = body[column];
    }

    return data;
  }, {});
}

function validateRequiredFields(body, requiredFields) {
  const missingFields = requiredFields.filter((field) => {
    const value = body[field];
    return value === undefined || value === null || value === "";
  });

  if (missingFields.length) {
    throw createHttpError(
      400,
      `Campos obrigatórios ausentes: ${missingFields.join(", ")}.`,
    );
  }
}

async function applyHook(hook, data, context) {
  return hook ? hook(data, context) : data;
}

function hideColumns(item, hiddenColumns = []) {
  if (!item || !hiddenColumns.length) {
    return item;
  }

  const visibleItem = { ...item };

  for (const column of hiddenColumns) {
    delete visibleItem[column];
  }

  return visibleItem;
}

function hideResponseColumns(data, hiddenColumns = []) {
  if (Array.isArray(data)) {
    return data.map((item) => hideColumns(item, hiddenColumns));
  }

  return hideColumns(data, hiddenColumns);
}

function transformResponseData(data, transformOutput) {
  if (!transformOutput) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => (item ? transformOutput(item) : item));
  }

  return data ? transformOutput(data) : data;
}

function isDriverTransportRequestList(request, definition) {
  return (
    definition.route === "solicitacoes-transporte" &&
    request.authUser?.perfil === "MOTORISTA"
  );
}

function shouldIncludeDriverOpenRequests(query) {
  const situation = String(query.situacao || "").toUpperCase();

  return !situation || ["PENDENTE", ...driverOpenRequestSituations].includes(situation);
}

async function findDriverIdForUser(request) {
  const pool = getDatabasePool();
  const [rows] = await pool.query(
    `SELECT id
       FROM motoristas
      WHERE usuario_id = ?
        AND instituicao_id = ?
        AND ativo = TRUE
      LIMIT 1`,
    [request.authUser?.id, request.authUser?.instituicao_id],
  );

  return rows[0]?.id || null;
}

function mergeUniqueById(items) {
  const seen = new Set();
  const merged = [];

  for (const item of items) {
    const key = String(item.id);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push(item);
  }

  return merged;
}

function sortDriverOpenRequestsFirst(items, driverId) {
  const situationPriority = new Map(
    driverOpenRequestSituations.map((situation, index) => [situation, index]),
  );

  return [...items].sort((a, b) => {
    const aOwnOpen =
      Number(a.motorista_id) === Number(driverId) &&
      situationPriority.has(a.situacao);
    const bOwnOpen =
      Number(b.motorista_id) === Number(driverId) &&
      situationPriority.has(b.situacao);

    if (aOwnOpen && bOwnOpen) {
      return situationPriority.get(a.situacao) - situationPriority.get(b.situacao);
    }

    if (aOwnOpen) {
      return -1;
    }

    if (bOwnOpen) {
      return 1;
    }

    return 0;
  });
}

async function includeDriverOpenTransportRequests(request, repository, query, items) {
  if (!shouldIncludeDriverOpenRequests(query)) {
    return items;
  }

  const driverId = await findDriverIdForUser(request);

  if (!driverId) {
    return items;
  }

  const openRequests = [];

  for (const situation of driverOpenRequestSituations) {
    const requests = await repository.list({
      ...query,
      motorista_id: driverId,
      offset: 0,
      situacao: situation,
    });

    openRequests.push(...requests);
  }

  return sortDriverOpenRequestsFirst(
    mergeUniqueById([...openRequests, ...items]),
    driverId,
  );
}

function isMaster(request) {
  return request.authUser?.perfil === "MASTER";
}

function isAdmin(request) {
  return request.authUser?.perfil === "ADMINISTRADOR";
}

function ensureSameInstitution(request, item, definition) {
  if (isMaster(request) || !definition.tenantColumn || !item?.[definition.tenantColumn]) {
    return;
  }

  if (Number(item[definition.tenantColumn]) !== Number(request.authUser?.instituicao_id)) {
    throw createHttpError(403, "Acesso negado para esta instituição.");
  }
}

function normalizeTenantQuery(request, definition) {
  if (!definition.tenantColumn || isMaster(request)) {
    return request.query;
  }

  return {
    ...request.query,
    instituicao_id: request.authUser?.instituicao_id,
  };
}

function enforceTenantOnWrite(request, data, definition) {
  if (!definition.tenantColumn || isMaster(request)) {
    return data;
  }

  return {
    ...data,
    [definition.tenantColumn]: request.authUser?.instituicao_id,
  };
}

function enforceOwnerOnWrite(request, data, definition) {
  if (
    definition.route === "solicitacoes-transporte" &&
    request.authUser?.perfil === "SOLICITANTE"
  ) {
    return {
      ...data,
      solicitante_usuario_id: request.authUser.id,
    };
  }

  if (definition.route === "motoristas" && request.authUser?.perfil === "MOTORISTA") {
    return {
      ...data,
      usuario_id: request.authUser.id,
    };
  }

  return data;
}

function assertResourceAllowed(request, definition, action) {
  const profile = request.authUser?.perfil;

  if (profile === "MASTER") {
    if (["list", "find"].includes(action)) {
      return;
    }

    if (!["instituicoes", "usuarios"].includes(definition.route)) {
      throw createHttpError(
        403,
        "O ADM master só pode gerenciar instituições e administradores.",
      );
    }

    return;
  }

  if (profile === "ADMINISTRADOR") {
    if (definition.route === "instituicoes" && !["list", "find"].includes(action)) {
      throw createHttpError(403, "O administrador não pode gerenciar instituições.");
    }

    return;
  }

  if (definition.route === "usuarios" && ["list", "find"].includes(action)) {
    return;
  }

  if (definition.route === "usuarios") {
    throw createHttpError(403, "Acesso negado para gerenciar usuários.");
  }

  if (action === "list" || action === "find") {
    return;
  }

  if (
    profile === "SOLICITANTE" &&
    !["solicitacoes-transporte", "chamados-suporte"].includes(definition.route)
  ) {
    throw createHttpError(403, "Acesso negado para alterar este cadastro.");
  }

  if (
    profile === "MOTORISTA" &&
    !["motoristas", "chamados-suporte"].includes(definition.route)
  ) {
    throw createHttpError(403, "Acesso negado para alterar este cadastro.");
  }
}

function assertUserWriteAllowed(request, data, currentItem) {
  const nextProfile = data.perfil || currentItem?.perfil;
  const nextProfileBase = String(nextProfile || "").split("|")[0];
  const isOwnProfile =
    currentItem &&
    Number(currentItem.id) === Number(request.authUser?.id) &&
    nextProfile === currentItem.perfil;

  if (isOwnProfile) {
    return;
  }

  if (isMaster(request)) {
    if (nextProfileBase !== "ADMINISTRADOR") {
      throw createHttpError(403, "O ADM master só pode cadastrar administradores.");
    }

    return;
  }

  if (isAdmin(request)) {
    if (!["SOLICITANTE", "MOTORISTA"].includes(nextProfileBase)) {
      throw createHttpError(
        403,
        "O administrador só pode cadastrar solicitantes e motoristas.",
      );
    }

    return;
  }

  throw createHttpError(403, "Acesso negado para gerenciar usuários.");
}

async function assertSingleAdminPerInstitution(repository, data, currentItem) {
  const nextProfile = data.perfil || currentItem?.perfil;
  const institutionId = data.instituicao_id || currentItem?.instituicao_id;

  if (nextProfile !== "ADMINISTRADOR" || !institutionId) {
    return;
  }

  const admins = await repository.list({
    instituicao_id: institutionId,
    limit: 200,
  });
  const hasAnotherAdmin = admins.some(
    (user) =>
      user.perfil === "ADMINISTRADOR" &&
      user.ativo !== false &&
      Number(user.id) !== Number(currentItem?.id),
  );

  if (hasAnotherAdmin) {
    throw createHttpError(409, "Esta instituição já possui um administrador cadastrado.");
  }
}

async function assertUniqueUsername(data, currentItem) {
  if (!Object.prototype.hasOwnProperty.call(data, "nome_usuario")) {
    return;
  }

  const username = String(data.nome_usuario || "").trim();

  if (!username) {
    return;
  }

  const pool = getDatabasePool();
  const [rows] = await pool.query(
    `SELECT id
       FROM usuarios
      WHERE UPPER(nome_usuario) = UPPER(?)
        AND id <> ?
      LIMIT 1`,
    [username, currentItem?.id || 0],
  );

  if (rows.length) {
    throw createHttpError(409, "Este nome de usuário já está cadastrado. Use outro.");
  }
}

function createResourceController(repository, definition) {
  const sanitize = (data) =>
    hideResponseColumns(
      transformResponseData(data, definition.transformOutput),
      definition.hiddenColumns,
    );

  async function list(request, response, next) {
    try {
      assertResourceAllowed(request, definition, "list");
      const query = normalizeTenantQuery(request, definition);
      let items = await repository.list(query);

      if (isDriverTransportRequestList(request, definition)) {
        items = await includeDriverOpenTransportRequests(
          request,
          repository,
          query,
          items,
        );
      }

      response.json({ data: sanitize(items) });
    } catch (error) {
      next(error);
    }
  }

  async function findById(request, response, next) {
    try {
      assertResourceAllowed(request, definition, "find");
      const item = await repository.findById(request.params.id);

      if (!item) {
        throw createHttpError(404, "Registro não encontrado.");
      }

      ensureSameInstitution(request, item, definition);
      response.json({ data: sanitize(item) });
    } catch (error) {
      next(error);
    }
  }

  async function create(request, response, next) {
    try {
      assertResourceAllowed(request, definition, "create");
      let data = await applyHook(
        definition.beforeCreate,
        pickWritableData(request.body, definition.writableColumns),
        { request },
      );
      data = enforceTenantOnWrite(request, data, definition);
      data = enforceOwnerOnWrite(request, data, definition);
      validateRequiredFields(data, definition.requiredOnCreate);

      if (definition.route === "usuarios") {
        assertUserWriteAllowed(request, data);
        await assertUniqueUsername(data);
        await assertSingleAdminPerInstitution(repository, data);
      }

      const item = await repository.create(data);

      if (definition.afterCreate) {
        await definition.afterCreate(item, request.body || {});
      }

      response.status(201).json({ data: sanitize(item) });
    } catch (error) {
      next(error);
    }
  }

  async function update(request, response, next) {
    try {
      assertResourceAllowed(request, definition, "update");
      const currentItem = await repository.findById(request.params.id);

      if (!currentItem) {
        throw createHttpError(404, "Registro não encontrado.");
      }

      ensureSameInstitution(request, currentItem, definition);
      let data = await applyHook(
        definition.beforeUpdate,
        pickWritableData(request.body, definition.writableColumns),
        { currentItem, request },
      );
      data = enforceTenantOnWrite(request, data, definition);
      data = enforceOwnerOnWrite(request, data, definition);

      if (definition.route === "usuarios") {
        assertUserWriteAllowed(request, data, currentItem);
        await assertUniqueUsername(data, currentItem);
        await assertSingleAdminPerInstitution(repository, data, currentItem);
      }

      const item = await repository.update(request.params.id, data);

      response.json({ data: sanitize(item) });
    } catch (error) {
      next(error);
    }
  }

  async function inactivate(request, response, next) {
    try {
      assertResourceAllowed(request, definition, "inactivate");
      const currentItem = await repository.findById(request.params.id);

      if (!currentItem) {
        throw createHttpError(404, "Registro não encontrado.");
      }

      ensureSameInstitution(request, currentItem, definition);
      const item = await repository.inactivate(request.params.id);
      response.json({ data: sanitize(item) });
    } catch (error) {
      next(error);
    }
  }

  return {
    create,
    findById,
    inactivate,
    list,
    update,
  };
}

module.exports = createResourceController;
