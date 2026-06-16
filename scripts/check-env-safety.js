const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const gitignorePath = path.join(root, ".gitignore");
const envExamplePath = path.join(root, ".env.example");

function readLines(filePath) {
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function assertLine(lines, expectedLine) {
  if (!lines.includes(expectedLine)) {
    throw new Error(`.gitignore deve conter: ${expectedLine}`);
  }
}

function main() {
  const gitignoreLines = readLines(gitignorePath);
  const envExample = fs.readFileSync(envExamplePath, "utf8");

  assertLine(gitignoreLines, ".env");
  assertLine(gitignoreLines, ".env.*");
  assertLine(gitignoreLines, "!.env.example");

  if (!envExample.includes("JWT_SECRET=substitua-por-um-segredo-longo-e-aleatorio")) {
    throw new Error(".env.example deve manter JWT_SECRET como placeholder, não como segredo real.");
  }

  if (/DB_PASSWORD=.+\S/.test(envExample)) {
    throw new Error(".env.example não deve conter senha real de banco.");
  }

  if (/SMTP_PASSWORD=.+\S/.test(envExample)) {
    throw new Error(".env.example não deve conter senha real de SMTP.");
  }

  console.log("Proteção de .env validada.");
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
