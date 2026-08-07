import { Router } from "express";
import {
  createMovieHandler,
  deleteMovieHandler,
  listMoviesHandler,
  updateMovieHandler,
} from "./movie.controller";

export const movieRouter = Router();

movieRouter.post("/", createMovieHandler);
movieRouter.get("/", listMoviesHandler);
movieRouter.patch("/:id", updateMovieHandler);
movieRouter.delete("/:id", deleteMovieHandler);
