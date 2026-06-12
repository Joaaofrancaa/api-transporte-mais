const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

function parsePositiveInteger(value, fallback) {
  const parsedValue = Number.parseInt(value, 10);
  return Number.isInteger(parsedValue) && parsedValue > 0
    ? parsedValue
    : fallback;
}

function parseCorsOrigins(value) {
  if (!value || value === "*") {
    return true;
  }

  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const nodeEnv = process.env.NODE_ENV || "development";

module.exports = Object.freeze({
  appName: "API Transporte Mais",
  nodeEnv,
  isProduction: nodeEnv === "production",
  port: parsePositiveInteger(process.env.PORT, 3000),
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGIN),
  jsonLimit: process.env.JSON_LIMIT || "1mb",
  database: {
    host: process.env.DB_HOST || "localhost",
    port: parsePositiveInteger(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    name: process.env.DB_NAME || "transporte_mais",
    connectionLimit: parsePositiveInteger(process.env.DB_CONNECTION_LIMIT, 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET || "",
    expiresIn: process.env.JWT_EXPIRES_IN || "8h",
  },
});
