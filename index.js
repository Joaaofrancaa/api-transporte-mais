// Pin the process to Brasília time regardless of the host's default (e.g. a
// UTC container) — every DATETIME in this app (saida_em, retorno_em, etc.)
// is a naive wall-clock value meant literally as Brasília time, and this
// keeps any Date-based logic that isn't already timezone-explicit consistent
// with that.
process.env.TZ = process.env.TZ || "America/Sao_Paulo";

const { startServer } = require("./src/server");

startServer().catch((error) => {
  console.error("Falha ao iniciar a API.", error);
  process.exitCode = 1;
});
