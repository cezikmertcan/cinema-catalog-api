import { deleteKey } from "../../infrastructure/cache/redis";

export const movieListCacheKey = (includeDirector = false): string => {
  const suffix = includeDirector ? ":with-director" : "";
  return `moviehub:movies:list:v1${suffix}`;
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

export const invalidateMovieDirectorCaches = async (
  movieIds: readonly string[],
): Promise<void> => {
  await Promise.all([
    deleteKey(movieListCacheKey(true)),
    ...movieIds.map((movieId) => deleteKey(movieCacheKey(movieId, true))),
  ]);
};
