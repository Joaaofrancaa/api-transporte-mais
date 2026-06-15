const createHttpError = require("../utils/http-error");

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

function createResourceController(repository, definition) {
  const sanitize = (data) => hideResponseColumns(data, definition.hiddenColumns);

  async function list(request, response, next) {
    try {
      const items = await repository.list(request.query);
      response.json({ data: sanitize(items) });
    } catch (error) {
      next(error);
    }
  }

  async function findById(request, response, next) {
    try {
      const item = await repository.findById(request.params.id);

      if (!item) {
        throw createHttpError(404, "Registro não encontrado.");
      }

      response.json({ data: sanitize(item) });
    } catch (error) {
      next(error);
    }
  }

  async function create(request, response, next) {
    try {
      validateRequiredFields(request.body, definition.requiredOnCreate);
      const data = await applyHook(
        definition.beforeCreate,
        pickWritableData(request.body, definition.writableColumns),
        { request },
      );
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
      const currentItem = await repository.findById(request.params.id);

      if (!currentItem) {
        throw createHttpError(404, "Registro não encontrado.");
      }

      const data = await applyHook(
        definition.beforeUpdate,
        pickWritableData(request.body, definition.writableColumns),
        { currentItem, request },
      );
      const item = await repository.update(request.params.id, data);

      response.json({ data: sanitize(item) });
    } catch (error) {
      next(error);
    }
  }

  async function inactivate(request, response, next) {
    try {
      const currentItem = await repository.findById(request.params.id);

      if (!currentItem) {
        throw createHttpError(404, "Registro não encontrado.");
      }

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
