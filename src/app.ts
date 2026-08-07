import express, { type Express, type RequestHandler } from "express";
import { env } from "./config/env";
import { connectToCache } from "./infrastructure/cache/redis";
import { connectToDatabase } from "./infrastructure/database/mongoose";
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

export const buildApp = (): Express => {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json());

  app.get("/health", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });

  app.use(dependencyMiddleware);
  app.use("/api/v1/directors", directorRouter);
  app.use("/api/v1/movies", movieRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

const app = buildApp();

export default app;
