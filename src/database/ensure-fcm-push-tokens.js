const { getDatabasePool } = require("./connection");

async function ensureFcmPushTokensTable() {
  const pool = getDatabasePool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS fcm_push_tokens (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      instituicao_id BIGINT UNSIGNED NOT NULL,
      usuario_id BIGINT UNSIGNED NOT NULL,
      perfil ENUM('SOLICITANTE', 'MOTORISTA', 'ADMINISTRADOR', 'MASTER') NOT NULL,
      token VARCHAR(512) NOT NULL,
      plataforma VARCHAR(30) NOT NULL DEFAULT 'android',
      ativo BOOLEAN NOT NULL DEFAULT TRUE,
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_fcm_push_tokens_token (token),
      KEY idx_fcm_push_tokens_usuario (usuario_id, ativo),
      KEY idx_fcm_push_tokens_instituicao_perfil (instituicao_id, perfil, ativo),
      CONSTRAINT fk_fcm_push_tokens_instituicao
        FOREIGN KEY (instituicao_id) REFERENCES instituicoes (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
      CONSTRAINT fk_fcm_push_tokens_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

module.exports = {
  ensureFcmPushTokensTable,
};
