const APP_TIME_ZONE = process.env.APP_TIME_ZONE || "America/Sao_Paulo";

// All DATETIME columns in this app (saida_em, retorno_em, aceito_em, ...)
// are naive wall-clock values meant literally as Brasília time — this
// formats a JS Date into that same "YYYY-MM-DD HH:MM:SS" shape, regardless
// of the process's own timezone, so every DATETIME the app writes is
// consistent with the ones users type in through the UI.
function getCurrentLocalSqlDateTime(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone: APP_TIME_ZONE,
    year: "numeric",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second}`;
}

module.exports = {
  APP_TIME_ZONE,
  getCurrentLocalSqlDateTime,
};
