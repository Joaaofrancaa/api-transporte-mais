const {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} = require("node:crypto");

const env = require("../config/env");

const CIPHER_PREFIX = "aes256gcm";
const CIPHER_VERSION = "v1";
const CIPHER_ALGO = "aes-256-gcm";
const IV_LENGTH = 12;

const HASH_PREFIX = "hmac-sha256";
const HASH_VERSION = "v1";

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function getEncryptionKey() {
  const key = env.cpf.encryptionKey;

  if (!key || key.length !== 64) {
    throw new Error(
      "CPF_ENCRYPTION_KEY ausente ou inválida (esperado hex de 32 bytes/64 caracteres).",
    );
  }

  return Buffer.from(key, "hex");
}

function getHashSecret() {
  if (!env.cpf.hashSecret) {
    throw new Error("CPF_HASH_SECRET ausente.");
  }

  return env.cpf.hashSecret;
}

function isEncryptedCpf(value) {
  return String(value || "")
    .toLowerCase()
    .startsWith(`${CIPHER_PREFIX}$${CIPHER_VERSION}$`);
}

function encryptCpf(cpf) {
  const plain = String(cpf || "");
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(CIPHER_ALGO, getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    CIPHER_PREFIX,
    CIPHER_VERSION,
    iv.toString("hex"),
    authTag.toString("hex"),
    ciphertext.toString("hex"),
  ].join("$");
}

function decryptCpf(storedValue) {
  const stored = String(storedValue || "");

  if (!isEncryptedCpf(stored)) {
    return stored;
  }

  try {
    const [, , ivHex, authTagHex, ciphertextHex] = stored.split("$");
    const decipher = createDecipheriv(CIPHER_ALGO, getEncryptionKey(), Buffer.from(ivHex, "hex"));

    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertextHex, "hex")),
      decipher.final(),
    ]);

    return plaintext.toString("utf8");
  } catch (error) {
    console.error("CPF_DECRYPT_ERROR " + JSON.stringify({ message: error.message }));
    return stored;
  }
}

function hashCpfDigits(cpf) {
  const digits = onlyDigits(cpf);
  const hmac = createHmac("sha256", getHashSecret()).update(digits).digest("hex");

  return [HASH_PREFIX, HASH_VERSION, hmac].join("$");
}

module.exports = {
  decryptCpf,
  encryptCpf,
  hashCpfDigits,
  isEncryptedCpf,
  onlyDigits,
};
