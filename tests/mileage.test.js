const assert = require("node:assert/strict");
const test = require("node:test");

const { ensureFinalMileageNotLower, parseMileage } = require("../src/utils/mileage");

test("parseMileage aceita valores com pontos", () => {
  assert.equal(parseMileage("802.000"), 802000);
  assert.equal(parseMileage("801000"), 801000);
});

test("ensureFinalMileageNotLower permite quilometragem final maior ou igual", () => {
  assert.doesNotThrow(() => ensureFinalMileageNotLower("801.000", "802.000"));
  assert.doesNotThrow(() => ensureFinalMileageNotLower("801.000", "801.000"));
});

test("ensureFinalMileageNotLower retorna erro claro quando final e menor que inicial", () => {
  assert.throws(
    () => ensureFinalMileageNotLower("802.000", "801.000"),
    (error) => {
      assert.equal(error.statusCode, 409);
      assert.equal(error.publicMessage, "A quilometragem final não pode ser menor que a quilometragem inicial.");
      return true;
    },
  );
});
