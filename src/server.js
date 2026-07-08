const createApp = require("./app");
const env = require("./config/env");
const { closeDatabasePool } = require("./database/connection");
const { ensureBillingStatusColumn } = require("./database/ensure-billing-status-column");
const {
  ensureTrackingDetailsColumns,
} = require("./database/ensure-tracking-details-columns");
const {
  ensureTrackingRequesterColumn,
} = require("./database/ensure-tracking-requester-column");
const {
  ensureTrackingReturnOptional,
} = require("./database/ensure-tracking-return-optional");
const {
  ensureRequestRoutineColumn,
} = require("./database/ensure-request-routine-column");
const {
  ensureRequestUnitColumn,
} = require("./database/ensure-request-unit-column");
const {
  removeRequestPriorityColumn,
} = require("./database/remove-request-priority-column");
const {
  ensureUserHealthPlansColumn,
} = require("./database/ensure-user-health-plans-column");
const {
  ensureInstitutionContactColumns,
} = require("./database/ensure-institution-contact-columns");
const {
  ensureInstitutionLogoColumn,
} = require("./database/ensure-institution-logo-column");
const { ensureUserProfileColumn } = require("./database/ensure-user-profile-column");
const { ensureTransportCompaniesTable } = require("./database/ensure-transport-companies-table");
const { ensureFcmPushTokensTable } = require("./database/ensure-fcm-push-tokens");
const { ensurePushSubscriptionsTable } = require("./database/ensure-push-subscriptions");
const {
  ensureTransportRequestNotificationsTable,
} = require("./database/ensure-transport-request-notifications");
const {
  startAutomaticBackups,
  stopAutomaticBackups,
} = require("./services/database-backup");
const {
  startDueTransportRequestNotifications,
  stopDueTransportRequestNotifications,
} = require("./services/push-notifications");

async function startServer() {
  await ensurePushSubscriptionsTable();
  await ensureFcmPushTokensTable();
  await ensureTransportRequestNotificationsTable();
  await ensureBillingStatusColumn();
  await ensureTrackingDetailsColumns();
  await ensureTrackingRequesterColumn();
  await ensureTrackingReturnOptional();
  await ensureRequestRoutineColumn();
  await ensureRequestUnitColumn();
  await removeRequestPriorityColumn();
  await ensureUserHealthPlansColumn();
  await ensureInstitutionContactColumns();
  await ensureInstitutionLogoColumn();
  await ensureUserProfileColumn();
  await ensureTransportCompaniesTable();

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(
      `${env.appName} executando na porta ${env.port} em modo ${env.nodeEnv}.`,
    );
  });
  startAutomaticBackups();
  startDueTransportRequestNotifications();

  let isShuttingDown = false;

  async function shutdown(signal) {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    console.log(`${signal} recebido. Encerrando a API...`);

    server.close(async (error) => {
      if (error) {
        console.error("Falha ao encerrar o servidor HTTP.", error);
        process.exitCode = 1;
      }

      try {
        stopDueTransportRequestNotifications();
        stopAutomaticBackups();
        await closeDatabasePool();
      } catch (databaseError) {
        console.error("Falha ao encerrar o pool do banco.", databaseError);
        process.exitCode = 1;
      }
    });
  }

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));

  return server;
}

module.exports = { startServer };
