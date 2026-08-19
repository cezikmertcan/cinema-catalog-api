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
  findPaginatedMoviesByDirectorIds,
  moviesExistForDirector,
} from "../movies/movie.repository";
import { invalidateMovieDirectorCaches } from "../movies/movie.cache";
import { serializeMovie } from "../movies/movie.serializer";
import type { MovieDocument } from "../movies/movie.model";
import type { DirectorDocument } from "./director.model";
import {
  createPaginationMeta,
  defaultPagination,
  type PaginatedQueryResult,
  type PaginatedResponse,
  type PaginationOptions,
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
  movies: PaginatedQueryResult<MovieDocument> | undefined,
  moviesPagination: PaginationOptions | undefined,
): DirectorQueryResponse => {
  const response = serializeDirector(director);

  if (movies === undefined || moviesPagination === undefined) {
    return response;
  }

  return {
    ...response,
    movies: movies.items.map(serializeMovie),
    moviesMeta: createPaginationMeta(moviesPagination, movies.total),
  };
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

  const moviesPagination = options.moviesPagination ?? defaultPagination;
  const moviesByDirectorId = await findPaginatedMoviesByDirectorIds(
    directors.map((director) => director._id.toString()),
    moviesPagination,
  );

  return {
    data: directors.map((director) =>
      serializeDirectorResult(
        director,
        moviesByDirectorId.get(director._id.toString()),
        moviesPagination,
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

  const moviesPagination =
    options.includeMovies === true
      ? options.moviesPagination ?? defaultPagination
      : undefined;
  const movies =
    moviesPagination !== undefined
      ? await findPaginatedMoviesByDirectorIds([directorId], moviesPagination)
      : undefined;

  return serializeDirectorResult(
    director,
    movies?.get(directorId),
    moviesPagination,
  );
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
