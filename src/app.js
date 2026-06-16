const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");

const env = require("./config/env");
const routes = require("./routes");
const errorHandler = require("./middlewares/error-handler");
const notFound = require("./middlewares/not-found");

function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", env.trustProxy);
  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: env.jsonLimit }));
  app.use(express.urlencoded({ extended: true, limit: env.jsonLimit }));
  app.use(morgan(env.isProduction ? "combined" : "dev"));

  app.use(routes);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
