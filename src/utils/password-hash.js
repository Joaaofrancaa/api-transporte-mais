const {
  pbkdf2Sync,
  randomBytes,
  timingSafeEqual,
} = require("node:crypto");

const HASH_PREFIX = "pbkdf2";
const DIGEST = "sha256";
const ITERATIONS = 120000;
const KEY_LENGTH = 32;

function isPasswordHash(value) {
  return String(value || "").startsWith(`${HASH_PREFIX}$`);
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(
    String(password),
    salt,
    ITERATIONS,
    KEY_LENGTH,
    DIGEST,
  ).toString("hex");

  return [HASH_PREFIX, DIGEST, ITERATIONS, salt, hash].join("$");
}

function verifyPassword(password, storedValue) {
  const stored = String(storedValue || "");

  if (!isPasswordHash(stored)) {
    return stored === String(password || "");
  }

  const [prefix, digest, iterations, salt, hash] = stored.split("$");

  if (prefix !== HASH_PREFIX || !digest || !iterations || !salt || !hash) {
    return false;
  }

  const expected = Buffer.from(hash, "hex");
  const actual = pbkdf2Sync(
    String(password),
    salt,
    Number(iterations),
    expected.length,
    digest,
  );

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function hashPasswordField(data, field = "senha_hash") {
  if (!data || !Object.prototype.hasOwnProperty.call(data, field)) {
    return data;
  }

  const password = data[field];

  if (!password || isPasswordHash(password)) {
    return data;
  }

  return {
    ...data,
    [field]: hashPassword(password),
  };
}

module.exports = {
  hashPassword,
  hashPasswordField,
  isPasswordHash,
  verifyPassword,
};
