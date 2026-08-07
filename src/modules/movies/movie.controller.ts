import type { RequestHandler } from "express";
import { asyncHandler } from "../../shared/http/async-handler";
import type { MovieDocument } from "./movie.model";
import {
  createMovie,
  deleteMovie,
  listMovies,
  updateMovie,
} from "./movie.service";
import {
  parseCreateMovie,
  parseUpdateMovie,
} from "./movie.validation";

const serializeMovie = (movie: MovieDocument) => ({
  id: movie._id.toString(),
  title: movie.title,
  description: movie.description,
  releaseDate: movie.releaseDate.toISOString().slice(0, 10),
  genre: movie.genre,
  rating: movie.rating,
  imdbId: movie.imdbId,
  directorId: movie.directorId.toString(),
});

const create: RequestHandler = async (request, response) => {
  const input = parseCreateMovie(request.body);
  const movie = await createMovie(input);

  response.status(201).json({
    data: serializeMovie(movie),
  });
};

const list: RequestHandler = async (_request, response) => {
  const movies = await listMovies();

  response.status(200).json({
    data: movies.map(serializeMovie),
  });
};

const update: RequestHandler = async (request, response) => {
  const input = parseUpdateMovie(request.body);
  const movie = await updateMovie(request.params.id, input);

  response.status(200).json({
    data: serializeMovie(movie),
  });
};

const remove: RequestHandler = async (request, response) => {
  await deleteMovie(request.params.id);
  response.status(204).send();
};

export const createMovieHandler = asyncHandler(create);
export const listMoviesHandler = asyncHandler(list);
export const updateMovieHandler = asyncHandler(update);
export const deleteMovieHandler = asyncHandler(remove);
