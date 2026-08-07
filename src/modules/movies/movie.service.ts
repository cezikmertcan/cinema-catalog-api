import { AppError } from "../../shared/errors/app-error";
import {
  deleteKey,
  getJson,
  setJson,
} from "../../infrastructure/cache/redis";
import {
  readObjectId,
  toObjectId,
} from "../../shared/validation/request-validation";
import { directorExists } from "../directors/director.repository";
import {
  deleteMovieById,
  findAllMovies,
  findMovieById,
  insertMovie,
  type PersistedMovieUpdateInput,
  updateMovieById,
} from "./movie.repository";
import {
  movieCacheKey,
  movieCacheTtlSeconds,
  movieListCacheKey,
  movieListCacheTtlSeconds,
} from "./movie.cache";
import { serializeMovie, type MovieResponse } from "./movie.serializer";
import type { CreateMovieInput, UpdateMovieInput } from "./movie.types";

const ensureDirectorExists = async (directorId: string): Promise<void> => {
  if (!(await directorExists(directorId))) {
    throw new AppError(
      404,
      "DIRECTOR_NOT_FOUND",
      `Director ${directorId} was not found.`,
    );
  }
};

export const createMovie = async (input: CreateMovieInput) => {
  await ensureDirectorExists(input.directorId);

  const movie = await insertMovie({
    ...input,
    directorId: toObjectId(input.directorId),
  });

  const response = serializeMovie(movie);
  await Promise.all([
    setJson(movieCacheKey(response.id), response, movieCacheTtlSeconds),
    deleteKey(movieListCacheKey),
  ]);

  return response;
};

export const listMovies = async (): Promise<MovieResponse[]> => {
  const cachedMovies = await getJson<MovieResponse[]>(movieListCacheKey);

  if (cachedMovies !== null) {
    return cachedMovies;
  }

  const movies = await findAllMovies();
  const response = movies.map(serializeMovie);
  await setJson(movieListCacheKey, response, movieListCacheTtlSeconds);

  return response;
};

export const getMovie = async (id: unknown): Promise<MovieResponse> => {
  const movieId = readObjectId(id, "movieId");
  const cachedMovie = await getJson<MovieResponse>(movieCacheKey(movieId));

  if (cachedMovie !== null) {
    return cachedMovie;
  }

  const movie = await findMovieById(movieId);

  if (movie === null) {
    throw new AppError(404, "MOVIE_NOT_FOUND", `Movie ${movieId} was not found.`);
  }

  const response = serializeMovie(movie);
  await setJson(movieCacheKey(movieId), response, movieCacheTtlSeconds);

  return response;
};

export const updateMovie = async (
  id: unknown,
  input: UpdateMovieInput,
) => {
  const movieId = readObjectId(id, "movieId");

  if (input.directorId !== undefined) {
    await ensureDirectorExists(input.directorId);
  }

  const { directorId, ...fieldsToUpdate } = input;
  const persistedInput: PersistedMovieUpdateInput =
    directorId === undefined
      ? fieldsToUpdate
      : { ...fieldsToUpdate, directorId: toObjectId(directorId) };

  const movie = await updateMovieById(movieId, persistedInput);

  if (movie === null) {
    throw new AppError(404, "MOVIE_NOT_FOUND", `Movie ${movieId} was not found.`);
  }

  const response = serializeMovie(movie);
  await Promise.all([
    setJson(movieCacheKey(movieId), response, movieCacheTtlSeconds),
    deleteKey(movieListCacheKey),
  ]);

  return response;
};

export const deleteMovie = async (id: unknown): Promise<void> => {
  const movieId = readObjectId(id, "movieId");
  const deletedMovie = await deleteMovieById(movieId);

  if (deletedMovie === null) {
    throw new AppError(404, "MOVIE_NOT_FOUND", `Movie ${movieId} was not found.`);
  }

  await Promise.all([
    deleteKey(movieCacheKey(movieId)),
    deleteKey(movieListCacheKey),
  ]);
};
