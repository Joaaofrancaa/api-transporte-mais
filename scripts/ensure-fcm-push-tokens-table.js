const { closeDatabasePool } = require("../src/database/connection");
const { ensureFcmPushTokensTable } = require("../src/database/ensure-fcm-push-tokens");

async function main() {
  await ensureFcmPushTokensTable();
  await closeDatabasePool();
  console.log("Tabela fcm_push_tokens verificada com sucesso.");
}

main().catch(async (error) => {
  console.error(error);
  await closeDatabasePool().catch(() => {});
  process.exitCode = 1;
});
