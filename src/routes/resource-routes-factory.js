const { Router } = require("express");

function createResourceRoutes(controller) {
  const router = Router();

  router.get("/", controller.list);
  router.post("/", controller.create);
  router.get("/:id", controller.findById);
  router.put("/:id", controller.update);
  router.patch("/:id/inativar", controller.inactivate);

  return router;
}

module.exports = createResourceRoutes;
