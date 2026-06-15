require("dotenv").config();

const mysql = require("mysql2/promise");

const createSupportTableSql = `
CREATE TABLE IF NOT EXISTS chamados_suporte (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id BIGINT UNSIGNED NULL,
  nome_usuario VARCHAR(160) NULL,
  email_usuario VARCHAR(160) NULL,
  assunto VARCHAR(180) NOT NULL,
  mensagem TEXT NOT NULL,
  situacao ENUM('ABERTO', 'EM_ANALISE', 'RESOLVIDO') NOT NULL DEFAULT 'ABERTO',
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_chamados_suporte_usuario_id (usuario_id),
  KEY idx_chamados_suporte_situacao (situacao),
  CONSTRAINT fk_chamados_suporte_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  await connection.execute(createSupportTableSql);
  await connection.end();
  console.log("Tabela chamados_suporte pronta.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
