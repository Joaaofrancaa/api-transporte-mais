const { getDatabasePool } = require("./connection");

async function ensureTransportRequestNotificationsTable() {
  const pool = getDatabasePool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS solicitacoes_transporte_notificacoes (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      solicitacao_id BIGINT UNSIGNED NOT NULL,
      notificado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_solicitacoes_transporte_notificacoes_solicitacao (solicitacao_id),
      KEY idx_solicitacoes_transporte_notificacoes_notificado_em (notificado_em),
      CONSTRAINT fk_solicitacoes_transporte_notificacoes_solicitacao
        FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes_transporte (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

module.exports = {
  ensureTransportRequestNotificationsTable,
};
