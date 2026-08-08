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
