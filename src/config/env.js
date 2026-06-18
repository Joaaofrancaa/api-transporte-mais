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

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return ["1", "true", "sim", "yes", "on"].includes(String(value).toLowerCase());
}

const nodeEnv = process.env.NODE_ENV || "development";

module.exports = Object.freeze({
  appName: "API Transporte Mais",
  nodeEnv,
  isProduction: nodeEnv === "production",
  port: parsePositiveInteger(process.env.PORT, 3000),
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGIN),
  jsonLimit: process.env.JSON_LIMIT || "1mb",
  trustProxy: parseBoolean(process.env.TRUST_PROXY, false),
  backup: {
    enabled: parseBoolean(process.env.BACKUP_AUTOMATICO, true),
    directory: process.env.BACKUP_DIR || "backups",
    intervalHours: parsePositiveInteger(process.env.BACKUP_INTERVAL_HOURS, 24),
  },
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
  },
  push: {
    publicKey: process.env.VAPID_PUBLIC_KEY || "",
    privateKey: process.env.VAPID_PRIVATE_KEY || "",
    subject: process.env.VAPID_SUBJECT || "mailto:suporte@example.com",
  },
});
