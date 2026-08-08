import express, { type Express, type RequestHandler } from "express";
import { env } from "./config/env";
import {
  checkCacheHealth,
  connectToCache,
} from "./infrastructure/cache/redis";
import {
  checkDatabaseHealth,
  connectToDatabase,
} from "./infrastructure/database/mongoose";
import { errorHandler } from "./middleware/error-handler";
import { notFoundHandler } from "./middleware/not-found-handler";
import { directorRouter } from "./modules/directors/director.routes";
import { movieRouter } from "./modules/movies/movie.routes";

const dependencyMiddleware: RequestHandler = async (
  _request,
  _response,
  next,
) => {
  try {
    await connectToDatabase(env.mongoUri);
    await connectToCache(env.redisUrl);
    next();
  } catch (error) {
    next(error);
  }
};

const healthHandler: RequestHandler = async (_request, response) => {
  const [database, cache] = await Promise.all([
    checkDatabaseHealth(env.mongoUri),
    checkCacheHealth(env.redisUrl),
  ]);
  const isHealthy = database.status === "up" && cache.status === "up";

  response.setHeader("Cache-Control", "no-store");
  response.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "ok" : "degraded",
    services: {
      mongodb: database,
      redis: cache,
    },
  });
};

export const buildApp = (): Express => {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json());

  app.get("/health", healthHandler);

  app.use(dependencyMiddleware);
  app.use("/api/v1/directors", directorRouter);
  app.use("/api/v1/movies", movieRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

const app = buildApp();

export default app;
