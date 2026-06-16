const { getDatabasePool, closeDatabasePool } = require("../src/database/connection");

async function countRows(connection, tableName) {
  const [rows] = await connection.query(`SELECT COUNT(*) AS total FROM ${tableName}`);

  return Number(rows[0]?.total || 0);
}

async function main() {
  const pool = getDatabasePool();
  const connection = await pool.getConnection();

  try {
    const [masters] = await connection.query(
      "SELECT id, instituicao_id, nome, nome_usuario FROM usuarios WHERE perfil = 'MASTER' ORDER BY id",
    );

    if (!masters.length) {
      throw new Error("Nenhum usuário MASTER encontrado. Limpeza abortada.");
    }

    const masterIds = masters.map((master) => Number(master.id));
    const masterInstitutionIds = [
      ...new Set(masters.map((master) => Number(master.instituicao_id)).filter(Boolean)),
    ];

    await connection.beginTransaction();

    await connection.query("DELETE FROM auditoria_logs");
    await connection.query("DELETE FROM chamados_suporte");
    await connection.query("DELETE FROM destinos_favoritos");
    await connection.query("DELETE FROM acompanhamentos_ambulancia");
    await connection.query("DELETE FROM solicitacoes_transporte");
    await connection.query("DELETE FROM motoristas");
    await connection.query("DELETE FROM acompanhantes");
    await connection.query("DELETE FROM medicos");
    await connection.query("DELETE FROM unidades");
    await connection.query("DELETE FROM setores");
    await connection.query("DELETE FROM usuarios WHERE perfil <> 'MASTER'");
    await connection.query(
      `DELETE FROM usuarios WHERE perfil = 'MASTER' AND id NOT IN (${masterIds.map(() => "?").join(", ")})`,
      masterIds,
    );

    if (masterInstitutionIds.length) {
      await connection.query(
        `DELETE FROM instituicoes WHERE id NOT IN (${masterInstitutionIds.map(() => "?").join(", ")})`,
        masterInstitutionIds,
      );
    }

    await connection.commit();

    const tablesToReset = [
      "auditoria_logs",
      "chamados_suporte",
      "destinos_favoritos",
      "acompanhamentos_ambulancia",
      "solicitacoes_transporte",
      "motoristas",
      "acompanhantes",
      "medicos",
      "unidades",
      "setores",
    ];

    for (const tableName of tablesToReset) {
      if ((await countRows(connection, tableName)) === 0) {
        await connection.query(`ALTER TABLE ${tableName} AUTO_INCREMENT = 1`);
      }
    }

    const [remainingUsers] = await connection.query(
      "SELECT id, nome, nome_usuario, perfil FROM usuarios ORDER BY id",
    );
    const [remainingInstitutions] = await connection.query(
      "SELECT id, nome FROM instituicoes ORDER BY id",
    );

    console.log("Banco limpo com sucesso.");
    console.log(`Masters mantidos: ${remainingUsers.length}`);
    console.log(JSON.stringify(remainingUsers, null, 2));
    console.log(`Instituições mantidas: ${remainingInstitutions.length}`);
    console.log(JSON.stringify(remainingInstitutions, null, 2));
  } catch (error) {
    await connection.rollback().catch(() => {});
    throw error;
  } finally {
    connection.release();
    await closeDatabasePool();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
