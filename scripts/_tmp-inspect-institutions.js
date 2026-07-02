require("dotenv").config();
const mysql = require("mysql2/promise");

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const [institutions] = await conn.query(
    "SELECT id, nome, ativo FROM instituicoes ORDER BY id",
  );
  console.log("INSTITUICOES:", JSON.stringify(institutions, null, 2));

  for (const inst of institutions) {
    const [[userCount]] = await conn.query(
      "SELECT COUNT(*) AS c FROM usuarios WHERE instituicao_id = ?",
      [inst.id],
    );
    const [users] = await conn.query(
      "SELECT id, nome_usuario, perfil, ativo FROM usuarios WHERE instituicao_id = ?",
      [inst.id],
    );
    const [[reqCount]] = await conn.query(
      "SELECT COUNT(*) AS c FROM solicitacoes_transporte WHERE instituicao_id = ?",
      [inst.id],
    );
    const [[trackCount]] = await conn.query(
      "SELECT COUNT(*) AS c FROM acompanhamentos_ambulancia WHERE instituicao_id = ?",
      [inst.id],
    );
    const [[setorCount]] = await conn.query(
      "SELECT COUNT(*) AS c FROM setores WHERE instituicao_id = ?",
      [inst.id],
    );
    const [[unidadeCount]] = await conn.query(
      "SELECT COUNT(*) AS c FROM unidades WHERE instituicao_id = ?",
      [inst.id],
    );
    const [[motoristaCount]] = await conn.query(
      "SELECT COUNT(*) AS c FROM motoristas WHERE instituicao_id = ?",
      [inst.id],
    );
    console.log(
      `Instituicao ${inst.id} (${inst.nome}): usuarios=${userCount.c} [${users.map((u) => u.nome_usuario + '/' + u.perfil).join(', ')}], solicitacoes=${reqCount.c}, acompanhamentos=${trackCount.c}, setores=${setorCount.c}, unidades=${unidadeCount.c}, motoristas=${motoristaCount.c}`,
    );
  }

  const [masterUsers] = await conn.query(
    "SELECT id, nome_usuario, instituicao_id, ativo FROM usuarios WHERE perfil = 'MASTER'",
  );
  console.log("MASTER USERS:", JSON.stringify(masterUsers, null, 2));

  await conn.end();
})().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
