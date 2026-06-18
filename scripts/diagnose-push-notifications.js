const { getDatabasePool, closeDatabasePool } = require("../src/database/connection");
const { isPushConfigured } = require("../src/services/push-notifications");

async function main() {
  const pool = getDatabasePool();

  const [subscriptions] = await pool.query(
    `SELECT perfil, ativo, COUNT(*) AS total, MAX(atualizado_em) AS ultima
       FROM push_subscriptions
      GROUP BY perfil, ativo
      ORDER BY perfil, ativo`,
  );
  const [driversByInstitution] = await pool.query(
    `SELECT instituicao_id, COUNT(*) AS total
       FROM usuarios
      WHERE perfil = 'MOTORISTA'
        AND ativo = TRUE
      GROUP BY instituicao_id
      ORDER BY instituicao_id`,
  );
  const [activeDriverSubscriptionsByInstitution] = await pool.query(
    `SELECT instituicao_id, COUNT(*) AS total
       FROM push_subscriptions
      WHERE perfil = 'MOTORISTA'
        AND ativo = TRUE
      GROUP BY instituicao_id
      ORDER BY instituicao_id`,
  );
  const [notifiedRequests] = await pool.query(
    `SELECT COUNT(*) AS total, MAX(notificado_em) AS ultima
       FROM solicitacoes_transporte_notificacoes`,
  );
  const [pendingRequests] = await pool.query(
    `SELECT COUNT(*) AS total
       FROM solicitacoes_transporte
      WHERE situacao = 'PENDENTE'`,
  );

  console.log(
    JSON.stringify(
      {
        pushConfigurado: isPushConfigured(),
        inscricoes: subscriptions,
        motoristasPorInstituicao: driversByInstitution,
        inscricoesAtivasMotoristaPorInstituicao: activeDriverSubscriptionsByInstitution,
        solicitacoesNotificadas: notifiedRequests[0],
        solicitacoesPendentes: pendingRequests[0],
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabasePool();
  });
