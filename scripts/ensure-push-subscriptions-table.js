const { closeDatabasePool } = require("../src/database/connection");
const { ensurePushSubscriptionsTable } = require("../src/database/ensure-push-subscriptions");
const {
  ensureTransportRequestNotificationsTable,
} = require("../src/database/ensure-transport-request-notifications");

async function main() {
  await ensurePushSubscriptionsTable();
  await ensureTransportRequestNotificationsTable();
  console.log("Tabelas de notificacoes push garantidas.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closeDatabasePool());
