const {
  getUserFcmTokenStatus,
  isFcmConfigured,
  removeFcmToken,
  saveFcmToken,
} = require("../services/fcm-notifications");
const createHttpError = require("../utils/http-error");

async function subscribe(request, response, next) {
  try {
    const result = await saveFcmToken(
      request.authUser,
      request.body?.token,
      request.body?.platform,
    );

    if (!result.valid) {
      throw createHttpError(400, "Token FCM invalido.");
    }

    response.status(201).json({
      data: {
        ok: true,
        configured: isFcmConfigured(),
        registered: result.registered,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function status(request, response, next) {
  try {
    response.json({
      data: await getUserFcmTokenStatus(request.authUser),
    });
  } catch (error) {
    next(error);
  }
}

async function unsubscribe(request, response, next) {
  try {
    await removeFcmToken(request.authUser, request.body?.token);
    response.json({ data: { ok: true } });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  status,
  subscribe,
  unsubscribe,
};
