const { getDatabasePool, closeDatabasePool } = require("../src/database/connection");

const INDEX_NAME = "uk_usuarios_nome_usuario_global";
const TABLE_NAME = "usuarios";

function normalizeUsername(value) {
  return String(value || "").trim().toUpperCase();
}

function buildUsername(base, id, attempt = 0) {
  const suffix = attempt > 0 ? `.${id}.${attempt}` : `.${id}`;
  const prefix = normalizeUsername(base).slice(0, Math.max(1, 80 - suffix.length));

  return `${prefix}${suffix}`;
}

async function usernameExists(connection, username, ignoredUserId = 0) {
  const [rows] = await connection.query(
    `SELECT id
       FROM usuarios
      WHERE UPPER(nome_usuario) = UPPER(?)
        AND id <> ?
      LIMIT 1`,
    [username, ignoredUserId],
  );

  return rows.length > 0;
}

async function makeUsernameUnique(connection, user) {
  let attempt = 0;
  let nextUsername = buildUsername(user.nome_usuario, user.id, attempt);

  while (await usernameExists(connection, nextUsername, user.id)) {
    attempt += 1;
    nextUsername = buildUsername(user.nome_usuario, user.id, attempt);
  }

  await connection.query("UPDATE usuarios SET nome_usuario = ? WHERE id = ?", [
    nextUsername,
    user.id,
  ]);

  return nextUsername;
}

async function resolveDuplicateUsernames(connection) {
  const [users] = await connection.query(
    `SELECT id, nome_usuario
       FROM usuarios
      ORDER BY id DESC`,
  );
  const seen = new Set();
  const renamedUsers = [];

  for (const user of users) {
    const key = normalizeUsername(user.nome_usuario);

    if (!key) {
      continue;
    }

    if (!seen.has(key)) {
      seen.add(key);
      continue;
    }

    const nextUsername = await makeUsernameUnique(connection, user);
    renamedUsers.push({
      id: user.id,
      previous: user.nome_usuario,
      next: nextUsername,
    });
    seen.add(normalizeUsername(nextUsername));
  }

  return renamedUsers;
}

async function hasIndex(connection) {
  const [rows] = await connection.query(
    `SELECT 1
       FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND INDEX_NAME = ?
      LIMIT 1`,
    [TABLE_NAME, INDEX_NAME],
  );

  return rows.length > 0;
}

async function main() {
  const pool = getDatabasePool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const renamedUsers = await resolveDuplicateUsernames(connection);
    await connection.commit();

    if (!(await hasIndex(connection))) {
      await connection.query(
        `ALTER TABLE usuarios
           ADD UNIQUE KEY ${INDEX_NAME} (nome_usuario)`,
      );
    }

    console.log("Indice global de nome_usuario garantido.");
    console.log(JSON.stringify({ renamedUsers }, null, 2));
  } catch (error) {
    await connection.rollback().catch(() => {});
    throw error;
  } finally {
    connection.release();
    await closeDatabasePool();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
