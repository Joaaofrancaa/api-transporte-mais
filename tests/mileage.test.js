const assert = require("node:assert/strict");
const test = require("node:test");

const { ensureFinalMileageGreaterThanInitial, parseMileage } = require("../src/utils/mileage");

test("parseMileage aceita valores com pontos", () => {
  assert.equal(parseMileage("802.000"), 802000);
  assert.equal(parseMileage("801000"), 801000);
});

test("ensureFinalMileageGreaterThanInitial permite quilometragem final maior", () => {
  assert.doesNotThrow(() => ensureFinalMileageGreaterThanInitial("801.000", "802.000"));
});

test("ensureFinalMileageGreaterThanInitial retorna erro claro quando final e menor que inicial", () => {
  assert.throws(
    () => ensureFinalMileageGreaterThanInitial("802.000", "801.000"),
    (error) => {
      assert.equal(error.statusCode, 409);
      assert.equal(error.publicMessage, "A quilometragem final deve ser maior que a quilometragem inicial.");
      return true;
    },
  );
});

test("ensureFinalMileageGreaterThanInitial retorna erro claro quando final e igual a inicial", () => {
  assert.throws(
    () => ensureFinalMileageGreaterThanInitial("801.000", "801.000"),
    (error) => {
      assert.equal(error.statusCode, 409);
      assert.equal(error.publicMessage, "A quilometragem final deve ser maior que a quilometragem inicial.");
      return true;
    },
  );
});
