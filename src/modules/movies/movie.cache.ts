export const movieListCacheKey = "moviehub:movies:list:v1";

export const movieCacheKey = (movieId: string): string => {
  return `moviehub:movies:${movieId}:v1`;
};

export const movieListCacheTtlSeconds = 60;
export const movieCacheTtlSeconds = 300;
