const { getDatabasePool } = require("./connection");

async function ensurePushSubscriptionsTable() {
  const pool = getDatabasePool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      instituicao_id BIGINT UNSIGNED NOT NULL,
      usuario_id BIGINT UNSIGNED NOT NULL,
      perfil ENUM('SOLICITANTE', 'MOTORISTA', 'ADMINISTRADOR', 'MASTER') NOT NULL,
      endpoint TEXT NOT NULL,
      p256dh VARCHAR(255) NOT NULL,
      auth VARCHAR(255) NOT NULL,
      user_agent VARCHAR(255) NULL,
      ativo BOOLEAN NOT NULL DEFAULT TRUE,
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_push_subscriptions_usuario_endpoint (usuario_id, endpoint(180)),
      KEY idx_push_subscriptions_instituicao_perfil (instituicao_id, perfil, ativo),
      CONSTRAINT fk_push_subscriptions_instituicao
        FOREIGN KEY (instituicao_id) REFERENCES instituicoes (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
      CONSTRAINT fk_push_subscriptions_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

module.exports = {
  ensurePushSubscriptionsTable,
};
