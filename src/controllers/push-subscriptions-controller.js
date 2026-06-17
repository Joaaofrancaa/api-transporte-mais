const env = require("../config/env");
const {
  isPushConfigured,
  removeSubscription,
  saveSubscription,
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
      throw createHttpError(503, "Notificações push não configuradas.");
    }

    await saveSubscription(
      request.authUser,
      request.body?.subscription,
      request.get("user-agent"),
    );

    response.status(201).json({ data: { ok: true } });
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
  subscribe,
  unsubscribe,
};
