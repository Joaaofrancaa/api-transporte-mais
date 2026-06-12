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
      `Campos obrigatorios ausentes: ${missingFields.join(", ")}.`,
    );
  }
}

function createResourceController(repository, definition) {
  async function list(request, response, next) {
    try {
      const items = await repository.list(request.query);
      response.json({ data: items });
    } catch (error) {
      next(error);
    }
  }

  async function findById(request, response, next) {
    try {
      const item = await repository.findById(request.params.id);

      if (!item) {
        throw createHttpError(404, "Registro nao encontrado.");
      }

      response.json({ data: item });
    } catch (error) {
      next(error);
    }
  }

  async function create(request, response, next) {
    try {
      validateRequiredFields(request.body, definition.requiredOnCreate);
      const data = pickWritableData(request.body, definition.writableColumns);
      const item = await repository.create(data);

      response.status(201).json({ data: item });
    } catch (error) {
      next(error);
    }
  }

  async function update(request, response, next) {
    try {
      const currentItem = await repository.findById(request.params.id);

      if (!currentItem) {
        throw createHttpError(404, "Registro nao encontrado.");
      }

      const data = pickWritableData(request.body, definition.writableColumns);
      const item = await repository.update(request.params.id, data);

      response.json({ data: item });
    } catch (error) {
      next(error);
    }
  }

  async function inactivate(request, response, next) {
    try {
      const currentItem = await repository.findById(request.params.id);

      if (!currentItem) {
        throw createHttpError(404, "Registro nao encontrado.");
      }

      const item = await repository.inactivate(request.params.id);
      response.json({ data: item });
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
