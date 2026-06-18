const assert = require("node:assert/strict");
const Module = require("node:module");
const test = require("node:test");

const originalLoad = Module._load;
const servicePath = require.resolve("../src/services/push-notifications");

function loadPushNotificationsService({ dueRequests = [], recipients = null } = {}) {
  const sent = [];
  const notifiedRequestIds = new Set();
  const webPush = {
    setVapidDetails: () => {},
    sendNotification: async (subscription, payload) => {
      sent.push({ subscription, payload: JSON.parse(payload) });
    },
  };
  const pool = {
    query: async (sql, values = []) => {
      if (sql.includes("CREATE TABLE IF NOT EXISTS solicitacoes_transporte_notificacoes")) {
        return [{}];
      }

      if (sql.includes("FROM solicitacoes_transporte_notificacoes")) {
        const requestId = values[0];
        return [notifiedRequestIds.has(requestId) ? [{ id: 1 }] : []];
      }

      if (sql.includes("INSERT IGNORE INTO solicitacoes_transporte_notificacoes")) {
        notifiedRequestIds.add(values[0]);
        return [{}];
      }

      if (sql.includes("FROM solicitacoes_transporte st")) {
        return [dueRequests.filter((request) => !notifiedRequestIds.has(request.id))];
      }

      if (sql.includes("FROM push_subscriptions ps")) {
        return [
          recipients || [
            {
              endpoint: "https://push.example.test/abc",
              p256dh: "p256dh-key",
              auth: "auth-key",
            },
          ],
        ];
      }

      return [[]];
    },
    execute: async () => [
      {},
    ],
  };

  delete require.cache[servicePath];
  Module._load = function mockLoad(request, parent, isMain) {
    if (parent?.filename === servicePath) {
      if (request === "web-push") {
        return webPush;
      }

      if (request === "../config/env") {
        return {
          push: {
            subject: "mailto:test@example.test",
            publicKey: "public-key",
            privateKey: "private-key",
          },
        };
      }

      if (request === "../database/connection") {
        return { getDatabasePool: () => pool };
      }
    }

    return originalLoad.apply(this, arguments);
  };

  try {
    return {
      notifiedRequestIds,
      service: require(servicePath),
      sent,
    };
  } finally {
    Module._load = originalLoad;
  }
}

test("nao notifica na criacao quando a solicitacao esta agendada para o futuro", async () => {
  const { service, sent } = loadPushNotificationsService();

  const result = await service.notifyNewTransportRequest({
    id: 42,
    instituicao_id: 7,
    nome_destino: "Santa Casa",
    agendado_para: "2099-01-01 10:00:00",
    prioridade: "ALTA",
  });

  assert.deepEqual(result, { scheduled: true });
  assert.equal(sent.length, 0);
});

test("processa e marca notificacao quando chega o horario agendado", async () => {
  const { notifiedRequestIds, service, sent } = loadPushNotificationsService({
    dueRequests: [
      {
        id: 42,
        instituicao_id: 7,
        nome_destino: "Santa Casa",
        agendado_para: "2026-06-18 10:00:00",
        prioridade: "ALTA",
        situacao: "PENDENTE",
      },
    ],
  });

  await service.processDueTransportRequestNotifications();

  assert.equal(sent.length, 1);
  assert.equal(sent[0].payload.title, "Nova solicitacao de transporte");
  assert.equal(sent[0].payload.tag, "solicitacao-transporte-42");
  assert.deepEqual(sent[0].payload.data, {
    section: "atendimento",
    requestId: 42,
  });
  assert.equal(notifiedRequestIds.has(42), true);

  await service.processDueTransportRequestNotifications();

  assert.equal(sent.length, 1);
});
