import { AppError } from "../../shared/errors/app-error";
import { readObjectId } from "../../shared/validation/request-validation";
import {
  deleteDirectorById,
  directorExists,
  findAllDirectors,
  findDirectorById,
  insertDirector,
  updateDirectorById,
} from "./director.repository";
import {
  findMovieIdsByDirectorId,
  findMoviesByDirectorIds,
  moviesExistForDirector,
} from "../movies/movie.repository";
import { invalidateMovieDirectorCaches } from "../movies/movie.cache";
import { serializeMovie } from "../movies/movie.serializer";
import type { MovieDocument } from "../movies/movie.model";
import type { DirectorDocument } from "./director.model";
import {
  createPaginationMeta,
  defaultPagination,
  type PaginatedResponse,
} from "../../shared/pagination/pagination";
import {
  serializeDirector,
  type DirectorQueryResponse,
} from "./director.serializer";
import type {
  CreateDirectorInput,
  DirectorQueryOptions,
  UpdateDirectorInput,
} from "./director.types";

const directorNotFound = (directorId: string): AppError => {
  return new AppError(
    404,
    "DIRECTOR_NOT_FOUND",
    `Director ${directorId} was not found.`,
  );
};

const serializeDirectorResult = (
  director: DirectorDocument,
  movies: MovieDocument[] | undefined,
): DirectorQueryResponse => {
  const response = serializeDirector(director);

  if (movies === undefined) {
    return response;
  }

  return {
    ...response,
    movies: movies.map(serializeMovie),
  };
};

const moviesByDirectorId = (
  movies: MovieDocument[],
): Map<string, MovieDocument[]> => {
  const groupedMovies = new Map<string, MovieDocument[]>();

  for (const movie of movies) {
    const directorId = movie.directorId.toString();
    const directorMovies = groupedMovies.get(directorId) ?? [];
    directorMovies.push(movie);
    groupedMovies.set(directorId, directorMovies);
  }

  return groupedMovies;
};

export const createDirector = async (input: CreateDirectorInput) => {
  return insertDirector(input);
};

export const listDirectors = async (
  options: DirectorQueryOptions = {},
): Promise<PaginatedResponse<DirectorQueryResponse>> => {
  const pagination = options.pagination ?? defaultPagination;
  const { items: directors, total } = await findAllDirectors(pagination);

  if (options.includeMovies !== true) {
    return {
      data: directors.map(serializeDirector),
      meta: createPaginationMeta(pagination, total),
    };
  }

  const movies = await findMoviesByDirectorIds(
    directors.map((director) => director._id.toString()),
  );
  const groupedMovies = moviesByDirectorId(movies);

  return {
    data: directors.map((director) =>
      serializeDirectorResult(
        director,
        groupedMovies.get(director._id.toString()) ?? [],
      ),
    ),
    meta: createPaginationMeta(pagination, total),
  };
};

export const getDirector = async (
  id: unknown,
  options: DirectorQueryOptions = {},
): Promise<DirectorQueryResponse> => {
  const directorId = readObjectId(id, "directorId");
  const director = await findDirectorById(directorId);

  if (director === null) {
    throw directorNotFound(directorId);
  }

  const movies =
    options.includeMovies === true
      ? await findMoviesByDirectorIds([directorId])
      : undefined;

  return serializeDirectorResult(director, movies);
};

export const updateDirector = async (
  id: unknown,
  input: UpdateDirectorInput,
) => {
  const directorId = readObjectId(id, "directorId");
  const director = await updateDirectorById(directorId, input);

  if (director === null) {
    throw directorNotFound(directorId);
  }

  const movieIds = await findMovieIdsByDirectorId(directorId);
  await invalidateMovieDirectorCaches(movieIds);

  return serializeDirector(director);
};

export const deleteDirector = async (id: unknown): Promise<void> => {
  const directorId = readObjectId(id, "directorId");

  if (!(await directorExists(directorId))) {
    throw directorNotFound(directorId);
  }

  if (await moviesExistForDirector(directorId)) {
    throw new AppError(
      409,
      "DIRECTOR_HAS_MOVIES",
      `Director ${directorId} cannot be deleted while movies reference it.`,
    );
  }

  const deletedDirector = await deleteDirectorById(directorId);

  if (deletedDirector === null) {
    throw directorNotFound(directorId);
  }
};
