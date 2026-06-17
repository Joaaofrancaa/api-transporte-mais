const { Router } = require("express");

const authController = require("../controllers/auth-controller");
const createResourceController = require("../controllers/resource-controller-factory");
const pushSubscriptionsController = require("../controllers/push-subscriptions-controller");
const solicitacoesTransporteActions = require("../controllers/solicitacoes-transporte-controller");
const auditLogger = require("../middlewares/audit-logger");
const authentication = require("../middlewares/authentication");
const createCrudRepository = require("../repositories/crud-repository");
const resources = require("../resources/resource-definitions");
const createResourceRoutes = require("./resource-routes-factory");

const router = Router();

router.get("/", (_request, response) => {
  response.json({
    service: "Transporte Mais",
    version: "v1",
    resources: Object.values(resources).map((resource) => resource.route),
  });
});

router.post("/autenticacao/entrar", authController.login);
router.post("/autenticacao/esqueci-senha", authController.requestPasswordRecovery);
router.post(
  "/autenticacao/validar-codigo-recuperacao",
  authController.validatePasswordRecoveryCode,
);
router.post("/autenticacao/redefinir-senha", authController.resetPassword);

router.use(authentication);
router.use(auditLogger);

router.get("/notificacoes-push/chave-publica", pushSubscriptionsController.getPublicKey);
router.get("/notificacoes-push/inscricoes/status", pushSubscriptionsController.status);
router.post("/notificacoes-push/inscricoes", pushSubscriptionsController.subscribe);
router.post("/notificacoes-push/teste", pushSubscriptionsController.test);
router.delete("/notificacoes-push/inscricoes", pushSubscriptionsController.unsubscribe);

for (const definition of Object.values(resources)) {
  const repository = createCrudRepository(definition);
  const controller = createResourceController(repository, definition);
  router.use(`/${definition.route}`, createResourceRoutes(controller));
}

router.patch(
  "/solicitacoes-transporte/:id/cancelar",
  solicitacoesTransporteActions.cancel,
);
router.patch(
  "/solicitacoes-transporte/:id/aceitar",
  solicitacoesTransporteActions.accept,
);
router.patch(
  "/solicitacoes-transporte/:id/iniciar",
  solicitacoesTransporteActions.start,
);
router.patch(
  "/solicitacoes-transporte/:id/concluir",
  solicitacoesTransporteActions.finish,
);

module.exports = router;
