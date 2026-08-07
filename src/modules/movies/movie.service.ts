import { AppError } from "../../shared/errors/app-error";
import {
  readObjectId,
  toObjectId,
} from "../../shared/validation/request-validation";
import { directorExists } from "../directors/director.repository";
import {
  deleteMovieById,
  findAllMovies,
  insertMovie,
  type PersistedMovieUpdateInput,
  updateMovieById,
} from "./movie.repository";
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

  return insertMovie({
    ...input,
    directorId: toObjectId(input.directorId),
  });
};

export const listMovies = async () => {
  return findAllMovies();
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

  return movie;
};

export const deleteMovie = async (id: unknown): Promise<void> => {
  const movieId = readObjectId(id, "movieId");
  const deletedMovie = await deleteMovieById(movieId);

  if (deletedMovie === null) {
    throw new AppError(404, "MOVIE_NOT_FOUND", `Movie ${movieId} was not found.`);
  }
};
