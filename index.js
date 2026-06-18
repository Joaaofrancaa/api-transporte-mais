const { startServer } = require("./src/server");

startServer().catch((error) => {
  console.error("Falha ao iniciar a API.", error);
  process.exitCode = 1;
});
