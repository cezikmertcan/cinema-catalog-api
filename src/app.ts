import express, { type Express } from "express";
import { errorHandler } from "./middleware/error-handler";
import { notFoundHandler } from "./middleware/not-found-handler";
import { directorRouter } from "./modules/directors/director.routes";
import { movieRouter } from "./modules/movies/movie.routes";

export const buildApp = (): Express => {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json());

  app.get("/health", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });

  app.use("/api/v1/directors", directorRouter);
  app.use("/api/v1/movies", movieRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
