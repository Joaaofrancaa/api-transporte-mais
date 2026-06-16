require("dotenv").config();

const mysql = require("mysql2/promise");

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "transporte_mais",
  });

  await connection.query(`
    CREATE TABLE IF NOT EXISTS auditoria_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      usuario_id BIGINT UNSIGNED NULL,
      instituicao_id BIGINT UNSIGNED NULL,
      perfil VARCHAR(40) NULL,
      metodo VARCHAR(10) NOT NULL,
      rota VARCHAR(255) NOT NULL,
      status_http SMALLINT UNSIGNED NOT NULL,
      ip VARCHAR(80) NULL,
      user_agent VARCHAR(255) NULL,
      corpo_requisicao JSON NULL,
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_auditoria_usuario_id (usuario_id),
      KEY idx_auditoria_instituicao_id (instituicao_id),
      KEY idx_auditoria_criado_em (criado_em),
      CONSTRAINT fk_auditoria_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
      CONSTRAINT fk_auditoria_instituicao
        FOREIGN KEY (instituicao_id) REFERENCES instituicoes (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  console.log("Recursos de seguranca garantidos: auditoria_logs.");
  await connection.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
