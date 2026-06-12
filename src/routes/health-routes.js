const { Router } = require("express");

const healthController = require("../controllers/health-controller");

const router = Router();

router.get("/", healthController.getHealth);
router.get("/db", healthController.getDatabaseHealth);

module.exports = router;
