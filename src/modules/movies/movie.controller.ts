import type { RequestHandler } from "express";
import { asyncHandler } from "../../shared/http/async-handler";
import {
  createMovie,
  deleteMovie,
  getMovie,
  listMovies,
  updateMovie,
} from "./movie.service";
import {
  parseCreateMovie,
  parseUpdateMovie,
} from "./movie.validation";

const create: RequestHandler = async (request, response) => {
  const input = parseCreateMovie(request.body);
  const movie = await createMovie(input);

  response.status(201).json({
    data: movie,
  });
};

const list: RequestHandler = async (_request, response) => {
  const movies = await listMovies();

  response.status(200).json({
    data: movies,
  });
};

const get: RequestHandler = async (request, response) => {
  const movie = await getMovie(request.params.id);

  response.status(200).json({
    data: movie,
  });
};

const update: RequestHandler = async (request, response) => {
  const input = parseUpdateMovie(request.body);
  const movie = await updateMovie(request.params.id, input);

  response.status(200).json({
    data: movie,
  });
};

const remove: RequestHandler = async (request, response) => {
  await deleteMovie(request.params.id);
  response.status(204).send();
};

export const createMovieHandler = asyncHandler(create);
export const listMoviesHandler = asyncHandler(list);
export const getMovieHandler = asyncHandler(get);
export const updateMovieHandler = asyncHandler(update);
export const deleteMovieHandler = asyncHandler(remove);
