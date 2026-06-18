const createApp = require("./app");
const env = require("./config/env");
const { closeDatabasePool } = require("./database/connection");
const { ensurePushSubscriptionsTable } = require("./database/ensure-push-subscriptions");
const {
  ensureTransportRequestNotificationsTable,
  startTransportRequestNotificationScheduler,
  stopTransportRequestNotificationScheduler,
} = require("./services/push-notifications");
const {
  startAutomaticBackups,
  stopAutomaticBackups,
} = require("./services/database-backup");

async function startServer() {
  await ensurePushSubscriptionsTable();
  await ensureTransportRequestNotificationsTable();

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(
      `${env.appName} executando na porta ${env.port} em modo ${env.nodeEnv}.`,
    );
  });
  startAutomaticBackups();
  startTransportRequestNotificationScheduler();

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
        stopTransportRequestNotificationScheduler();
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
