const { Router } = require("express");

const env = require("../config/env");
const apiV1Routes = require("./api-v1-routes");
const healthRoutes = require("./health-routes");

const router = Router();

router.get("/", (_request, response) => {
  response.json({
    service: env.appName,
    status: "online",
    apiVersion: "v1",
  });
});

router.use("/api/v1", apiV1Routes);
router.use("/health", healthRoutes);

module.exports = router;
