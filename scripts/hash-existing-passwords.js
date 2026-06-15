require("dotenv").config();

const {
  closeDatabasePool,
  getDatabasePool,
} = require("../src/database/connection");
const {
  hashPassword,
  isPasswordHash,
} = require("../src/utils/password-hash");

async function main() {
  const pool = getDatabasePool();
  const [users] = await pool.query(
    "SELECT id, nome_usuario, senha_hash FROM usuarios ORDER BY id",
  );
  let updated = 0;

  for (const user of users) {
    if (!user.senha_hash || isPasswordHash(user.senha_hash)) {
      continue;
    }

    await pool.query(
      "UPDATE usuarios SET senha_hash = ? WHERE id = ?",
      [hashPassword(user.senha_hash), user.id],
    );
    updated += 1;
    console.log(`Senha convertida para hash: ${user.nome_usuario}`);
  }

  console.log(`Usuarios verificados: ${users.length}`);
  console.log(`Senhas convertidas: ${updated}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabasePool();
  });
