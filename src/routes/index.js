const { Router } = require("express");

const env = require("../config/env");
const healthRoutes = require("./health-routes");

const router = Router();

router.get("/", (_request, response) => {
  response.json({
    service: env.appName,
    status: "online",
    apiVersion: "v1",
  });
});

router.get("/api/v1", (_request, response) => {
  response.json({
    service: env.appName,
    version: "v1",
  });
});

router.use("/health", healthRoutes);

module.exports = router;
