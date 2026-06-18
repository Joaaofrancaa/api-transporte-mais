const { closeDatabasePool } = require("../src/database/connection");
const { ensurePushSubscriptionsTable } = require("../src/database/ensure-push-subscriptions");

async function main() {
  await ensurePushSubscriptionsTable();
  console.log("Tabela push_subscriptions garantida.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closeDatabasePool());
