import {
  deleteKey,
  deleteKeysByPattern,
} from "../../infrastructure/cache/redis";
import type { PaginationOptions } from "../../shared/pagination/pagination";

export const movieListCachePrefix = "moviehub:movies:list:v2";

export interface MovieListCacheOptions extends PaginationOptions {
  includeDirector?: boolean;
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

  return `${movieListCachePrefix}:p${normalizedOptions.page}:l${normalizedOptions.limit}${suffix}`;
};

export const movieCacheKey = (
  movieId: string,
  includeDirector = false,
): string => {
  const suffix = includeDirector ? ":with-director" : "";
  return `moviehub:movies:${movieId}:v1${suffix}`;
};

export const movieListCacheTtlSeconds = 60;
export const movieCacheTtlSeconds = 300;

export const movieListCachePattern = (includeDirector?: boolean): string => {
  return includeDirector === true
    ? `${movieListCachePrefix}:*:with-director`
    : `${movieListCachePrefix}:*`;
};

export const invalidateMovieListCaches = async (): Promise<void> => {
  await deleteKeysByPattern(movieListCachePattern());
};

export const invalidateMovieDirectorCaches = async (
  movieIds: readonly string[],
): Promise<void> => {
  await Promise.all([
    deleteKeysByPattern(movieListCachePattern(true)),
    ...movieIds.map((movieId) => deleteKey(movieCacheKey(movieId, true))),
  ]);
};
