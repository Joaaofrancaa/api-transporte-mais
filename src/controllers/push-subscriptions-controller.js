const env = require("../config/env");
const {
  getUserSubscriptionStatus,
  isPushConfigured,
  removeSubscription,
  saveSubscription,
  sendTestNotification,
} = require("../services/push-notifications");
const createHttpError = require("../utils/http-error");

function getPublicKey(_request, response) {
  response.json({
    data: {
      enabled: isPushConfigured(),
      publicKey: env.push.publicKey,
    },
  });
}

async function subscribe(request, response, next) {
  try {
    if (!isPushConfigured()) {
      throw createHttpError(503, "Notificacoes push nao configuradas.");
    }

    const saved = await saveSubscription(
      request.authUser,
      request.body?.subscription,
      request.get("user-agent"),
    );

    if (!saved) {
      throw createHttpError(400, "Inscricao push invalida.");
    }

    response.status(201).json({ data: { ok: true } });
  } catch (error) {
    next(error);
  }
}

async function status(request, response, next) {
  try {
    response.json({
      data: await getUserSubscriptionStatus(request.authUser),
    });
  } catch (error) {
    next(error);
  }
}

async function test(request, response, next) {
  try {
    response.json({
      data: await sendTestNotification(request.authUser),
    });
  } catch (error) {
    next(error);
  }
}

async function unsubscribe(request, response, next) {
  try {
    await removeSubscription(request.authUser, request.body?.endpoint);
    response.json({ data: { ok: true } });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getPublicKey,
  status,
  subscribe,
  test,
  unsubscribe,
};
