import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/authentication";
import {
  createMovieHandler,
  deleteMovieHandler,
  getMovieHandler,
  listMoviesHandler,
  updateMovieHandler,
} from "./movie.controller";

export const movieRouter = Router();

movieRouter.post("/", authenticate, createMovieHandler);
movieRouter.get("/", listMoviesHandler);
movieRouter.get("/:id", getMovieHandler);
movieRouter.patch("/:id", authenticate, updateMovieHandler);
movieRouter.delete(
  "/:id",
  authenticate,
  requireRole("admin"),
  deleteMovieHandler,
);
