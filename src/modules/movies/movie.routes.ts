import { Router } from "express";
import {
  createMovieHandler,
  deleteMovieHandler,
  getMovieHandler,
  listMoviesHandler,
  updateMovieHandler,
} from "./movie.controller";

export const movieRouter = Router();

movieRouter.post("/", createMovieHandler);
movieRouter.get("/", listMoviesHandler);
movieRouter.get("/:id", getMovieHandler);
movieRouter.patch("/:id", updateMovieHandler);
movieRouter.delete("/:id", deleteMovieHandler);
