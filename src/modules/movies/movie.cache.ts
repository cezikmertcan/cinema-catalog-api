import {
  deleteKey,
  getOrInitializeInteger,
  incrementInteger,
} from "../../infrastructure/cache/redis";
import type { PaginationOptions } from "../../shared/pagination/pagination";

export const movieListCachePrefix = "cinema-catalog:movies:list:v3";

export interface MovieListCacheOptions extends PaginationOptions {
  includeDirector?: boolean;
  version?: number;
}

export const movieListCacheKey = (
  options: MovieListCacheOptions | boolean = {
    page: 1,
    limit: 20,
  },
): string => {
  const normalizedOptions =
    typeof options === "boolean"
      ? { page: 1, limit: 20, includeDirector: options }
      : options;
  const suffix = normalizedOptions.includeDirector ? ":with-director" : "";
  const version = normalizedOptions.version ?? 1;

  return `${movieListCachePrefix}:g${version}:p${normalizedOptions.page}:l${normalizedOptions.limit}${suffix}`;
};

export const movieCacheKey = (
  movieId: string,
  includeDirector = false,
): string => {
  const suffix = includeDirector ? ":with-director" : "";
  return `cinema-catalog:movies:${movieId}:v1${suffix}`;
};

export const movieListCacheTtlSeconds = 60;
export const movieCacheTtlSeconds = 300;

export const movieListCachePattern = (includeDirector?: boolean): string => {
  return includeDirector === true
    ? `${movieListCachePrefix}:g*:p*:l*:with-director`
    : `${movieListCachePrefix}:g*:p*:l*`;
};

export const movieListCacheVersionKey = (
  includeDirector = false,
): string => {
  const suffix = includeDirector ? ":with-director" : "";
  return `${movieListCachePrefix}:version${suffix}`;
};

export const getMovieListCacheVersion = async (
  includeDirector = false,
): Promise<number> => {
  return getOrInitializeInteger(movieListCacheVersionKey(includeDirector), 1);
};

export const bumpMovieListCacheVersion = async (
  includeDirector = false,
): Promise<number> => {
  return incrementInteger(movieListCacheVersionKey(includeDirector), 1);
};

export const invalidateMovieListCaches = async (): Promise<void> => {
  await Promise.all([
    bumpMovieListCacheVersion(),
    bumpMovieListCacheVersion(true),
  ]);
};

export const invalidateMovieDirectorCaches = async (
  movieIds: readonly string[],
): Promise<void> => {
  await Promise.all([
    bumpMovieListCacheVersion(true),
    ...movieIds.map((movieId) => deleteKey(movieCacheKey(movieId, true))),
  ]);
};
