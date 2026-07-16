const createHttpError = require("./http-error");

function parseMileage(value) {
  if (value == null || value === "") {
    return null;
  }

  const mileage = Number(String(value).replace(/\D/g, ""));

  return Number.isFinite(mileage) ? mileage : null;
}

function ensureFinalMileageGreaterThanInitial(initialValue, finalValue) {
  const initialMileage = parseMileage(initialValue);
  const finalMileage = parseMileage(finalValue);

  if (initialMileage != null && finalMileage != null && finalMileage <= initialMileage) {
    throw createHttpError(409, "A quilometragem final deve ser maior que a quilometragem inicial.");
  }
}

module.exports = {
  ensureFinalMileageGreaterThanInitial,
  parseMileage,
};
