export const movieListCacheKey = "cinema_catalog:movies:list:v1";

export const movieCacheKey = (movieId: string): string => {
  return `cinema_catalog:movies:${movieId}:v1`;
};

export const movieListCacheTtlSeconds = 60;
export const movieCacheTtlSeconds = 300;
