const { closeDatabasePool } = require("../src/database/connection");
const { createDatabaseBackup } = require("../src/services/database-backup");

createDatabaseBackup()
  .then((filePath) => {
    console.log(`Backup criado em: ${filePath}`);
  })
  .finally(closeDatabasePool)
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
