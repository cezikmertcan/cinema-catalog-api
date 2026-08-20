import { strict as assert } from "node:assert";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, beforeEach, test } from "node:test";
import mongoose from "mongoose";
import { buildApp } from "../src/app";
import {
  connectToCache,
  deleteKey,
  deleteKeysByPattern,
  disconnectFromCache,
  getJson,
  isCacheReady,
} from "../src/infrastructure/cache/redis";
import {
  connectToDatabase,
  disconnectFromDatabase,
  ensureDatabaseIndexes,
} from "../src/infrastructure/database/mongoose";
import {
  getMovieListCacheVersion,
  movieCacheKey,
  movieListCacheKey,
  movieListCachePattern,
} from "../src/modules/movies/movie.cache";
import type { MovieResponse } from "../src/modules/movies/movie.serializer";
import { createAccessToken } from "../src/modules/auth/auth.token";
import { UserModel } from "../src/modules/auth/user.model";

const testDatabaseUri =
  process.env.TEST_MONGODB_URI ??
  "mongodb://127.0.0.1:27017/cinema_catalog_test";
const testRedisUrl = process.env.TEST_REDIS_URL ?? "redis://127.0.0.1:6379";

const currentMovieListCacheKey = async (input: {
  page?: number;
  limit?: number;
  includeDirector?: boolean;
} = {}): Promise<string> => {
  const includeDirector = input.includeDirector === true;
  const version = await getMovieListCacheVersion(includeDirector);

  return movieListCacheKey({
    page: input.page ?? 1,
    limit: input.limit ?? 20,
    includeDirector,
    version,
  });
};

let server: Server;
let baseUrl: string;
let userAccessToken: string;
let adminAccessToken: string;

type TestRequestInit = RequestInit & {
  auth?: "user" | "admin" | "none";
  accessToken?: string;
};

const requestJson = async (
  path: string,
  init: TestRequestInit = {},
): Promise<{ status: number; body: unknown }> => {
  const { auth = "admin", accessToken, ...fetchInit } = init;
  const headers = new Headers(fetchInit.headers);

  headers.set("content-type", "application/json");

  if (auth !== "none") {
    headers.set(
      "authorization",
      `Bearer ${
        accessToken ?? (auth === "user" ? userAccessToken : adminAccessToken)
      }`,
    );
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...fetchInit,
    headers,
  });
  const responseText = await response.text();

  return {
    status: response.status,
    body: responseText.length > 0 ? JSON.parse(responseText) : undefined,
  };
};

const requestText = async (
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; body: string; contentType: string | null }> => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  return {
    status: response.status,
    body: await response.text(),
    contentType: response.headers.get("content-type"),
  };
};

const resourceId = (body: unknown): string => {
  if (
    typeof body !== "object" ||
    body === null ||
    !("data" in body) ||
    typeof body.data !== "object" ||
    body.data === null ||
    !("id" in body.data) ||
    typeof body.data.id !== "string"
  ) {
    throw new Error("Expected a resource response with an id.");
  }

  return body.data.id;
};

before(async () => {
  await Promise.all([
    connectToDatabase(testDatabaseUri),
    connectToCache(testRedisUrl),
  ]);

  assert.equal(isCacheReady(), true, "Redis must be running for endpoint tests.");

  server = createServer(buildApp());
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();

  if (address === null || typeof address === "string") {
    throw new Error("Test server did not expose a TCP address.");
  }

  baseUrl = `http://127.0.0.1:${(address as AddressInfo).port}`;
});

beforeEach(async () => {
  await mongoose.connection.dropDatabase();
  await ensureDatabaseIndexes();
  await deleteKeysByPattern(movieListCachePattern());

  const [user, admin] = await UserModel.create([
    {
      email: "test-user@example.com",
      passwordHash: "test-password-hash",
      role: "user",
      isActive: true,
    },
    {
      email: "test-admin@example.com",
      passwordHash: "test-password-hash",
      role: "admin",
      isActive: true,
    },
  ]);

  userAccessToken = createAccessToken({
    userId: user._id.toString(),
    role: user.role,
  });
  adminAccessToken = createAccessToken({
    userId: admin._id.toString(),
    role: admin.role,
  });
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  await disconnectFromCache();
  await disconnectFromDatabase();
});

test("reports application and dependency health", async () => {
  const response = await requestJson("/health");

  assert.equal(response.status, 200);

  const body = response.body as {
    status: string;
    services: {
      mongodb: { status: string; latencyMs: number };
      redis: { status: string; latencyMs: number };
    };
  };

  assert.equal(body.status, "ok");
  assert.equal(body.services.mongodb.status, "up");
  assert.equal(body.services.redis.status, "up");
  assert.equal(typeof body.services.mongodb.latencyMs, "number");
  assert.equal(typeof body.services.redis.latencyMs, "number");
});

test("serves the landing page and Swagger documentation", async () => {
  const root = await requestText("/");

  assert.equal(root.status, 200);
  assert.match(root.contentType ?? "", /text\/html/);
  assert.match(root.body, /href="\/docs"/);
  assert.match(root.body, /href="\/openapi\.json"/);

  const openApi = await requestJson("/openapi.json");
  assert.equal(openApi.status, 200);

  const document = openApi.body as {
    openapi: string;
    servers: Array<{ url: string }>;
    paths: Record<string, unknown>;
    components: {
      parameters: Record<string, { schema?: Record<string, unknown> }>;
    };
  };
  assert.equal(document.openapi, "3.0.3");
  assert.equal(document.servers[0]?.url, "/");
  assert.equal(typeof document.paths["/api/v1/directors"], "object");
  assert.equal(typeof document.paths["/api/v1/directors/{id}"], "object");
  assert.equal(typeof document.paths["/api/v1/movies"], "object");
  assert.equal(typeof document.paths["/api/v1/movies/{id}"], "object");
  assert.equal(typeof document.paths["/api/v1/auth/register"], "object");
  assert.equal(typeof document.paths["/api/v1/auth/login"], "object");
  assert.equal(typeof document.paths["/api/v1/auth/refresh"], "object");
  assert.equal(typeof document.paths["/api/v1/auth/logout"], "object");
  assert.equal(typeof document.paths["/api/v1/auth/me"], "object");
  assert.match(JSON.stringify(document), /PaginationMeta/);
  assert.match(JSON.stringify(document), /components\/parameters\/Page/);
  assert.match(JSON.stringify(document), /components\/parameters\/Limit/);
  assert.match(JSON.stringify(document), /components\/parameters\/MoviesPage/);
  assert.match(JSON.stringify(document), /components\/parameters\/MoviesLimit/);
  assert.match(JSON.stringify(document), /moviesMeta/);
  assert.match(JSON.stringify(document), /bearerAuth/);
  assert.match(JSON.stringify(document), /AuthSession/);

  for (const parameterName of [
    "Page",
    "Limit",
    "MoviesPage",
    "MoviesLimit",
  ]) {
    const schema = document.components.parameters[parameterName]?.schema ?? {};

    assert.equal("default" in schema, false);
    assert.equal("example" in schema, false);
  }

  const docs = await requestText("/docs");
  assert.equal(docs.status, 200);
  assert.match(docs.contentType ?? "", /text\/html/);
  assert.match(docs.body, /id="swagger-ui"/);
  assert.match(
    docs.body,
    /https:\/\/cdn\.jsdelivr\.net\/npm\/swagger-ui-dist@5\.32\.12\/swagger-ui\.css/,
  );
  assert.match(
    docs.body,
    /https:\/\/cdn\.jsdelivr\.net\/npm\/swagger-ui-dist@5\.32\.12\/swagger-ui-bundle\.js/,
  );
  assert.match(
    docs.body,
    /https:\/\/cdn\.jsdelivr\.net\/npm\/swagger-ui-dist@5\.32\.12\/swagger-ui-standalone-preset\.js/,
  );
  assert.match(docs.body, /url: "\/openapi\.json"/);
  assert.doesNotMatch(docs.body, /src="\.\/swagger-ui-/);

  const docsWithTrailingSlash = await requestText("/docs/");
  assert.equal(docsWithTrailingSlash.status, 200);
  assert.match(docsWithTrailingSlash.contentType ?? "", /text\/html/);
});

test("supports the director and movie lifecycle", async () => {
  const director = await requestJson("/api/v1/directors", {
    method: "POST",
    body: JSON.stringify({
      firstName: "Christopher",
      secondName: "Nolan",
      birthDate: "1970-07-30",
      bio: "British-American filmmaker.",
    }),
  });

  assert.equal(director.status, 201);
  const directorId = resourceId(director.body);

  const movie = await requestJson("/api/v1/movies", {
    method: "POST",
    body: JSON.stringify({
      title: "Inception",
      description: "A professional thief who steals secrets through dreams.",
      releaseDate: "2010-07-16",
      genre: "Science Fiction",
      rating: 8.8,
      imdbId: "tt1375666",
      directorId,
    }),
  });

  assert.equal(movie.status, 201);
  const movieId = resourceId(movie.body);

  const movieById = await requestJson(`/api/v1/movies/${movieId}`);
  assert.equal(movieById.status, 200);
  assert.equal(
    (movieById.body as { data: { id: string } }).data.id,
    movieId,
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(
      (movieById.body as { data: object }).data,
      "director",
    ),
    false,
  );

  const movieByIdWithDirector = await requestJson(
    `/api/v1/movies/${movieId}?include=director`,
  );
  assert.equal(movieByIdWithDirector.status, 200);
  const expandedMovie = movieByIdWithDirector.body as {
    data: {
      directorId: string;
      director: { id: string; firstName: string };
    };
  };
  assert.equal(expandedMovie.data.directorId, directorId);
  assert.equal(expandedMovie.data.director.id, directorId);
  assert.equal(expandedMovie.data.director.firstName, "Christopher");
  assert.equal(
    (await getJson<MovieResponse>(movieCacheKey(movieId, true)))?.director?.id,
    directorId,
  );

  const movies = await requestJson("/api/v1/movies");
  assert.equal(movies.status, 200);
  assert.equal((movies.body as { data: unknown[] }).data.length, 1);
  assert.equal(
    (await getJson<{ data: MovieResponse[] }>(await currentMovieListCacheKey()))?.data.length,
    1,
  );

  const moviesWithDirector = await requestJson(
    "/api/v1/movies?include=director",
  );
  assert.equal(moviesWithDirector.status, 200);
  const expandedMovieList = moviesWithDirector.body as {
    data: Array<{ director: { id: string } }>;
  };
  assert.equal(expandedMovieList.data[0]?.director.id, directorId);
  assert.equal(
    (await getJson<{ data: MovieResponse[] }>(await currentMovieListCacheKey({ includeDirector: true })))?.data[0]
      ?.director
      ?.id,
    directorId,
  );

  const movieListVersionBeforeUpdate = await getMovieListCacheVersion();
  const expandedMovieListVersionBeforeUpdate =
    await getMovieListCacheVersion(true);

  const updatedMovie = await requestJson(`/api/v1/movies/${movieId}`, {
    method: "PATCH",
    body: JSON.stringify({
      rating: 9,
      description: "Updated movie description.",
    }),
  });

  assert.equal(updatedMovie.status, 200);
  assert.equal(
    await getMovieListCacheVersion(),
    movieListVersionBeforeUpdate + 1,
  );
  assert.equal(
    await getMovieListCacheVersion(true),
    expandedMovieListVersionBeforeUpdate + 1,
  );
  assert.equal(
    (updatedMovie.body as { data: { rating: number } }).data.rating,
    9,
  );
  assert.equal(await getJson<{ data: MovieResponse[] }>(await currentMovieListCacheKey()), null);
  assert.equal(
    await getJson<{ data: MovieResponse[] }>(await currentMovieListCacheKey({ includeDirector: true })),
    null,
  );
  assert.equal(
    (await getJson<MovieResponse>(movieCacheKey(movieId)))?.rating,
    9,
  );
  assert.equal(await getJson<MovieResponse>(movieCacheKey(movieId, true)), null);

  const invalidInclude = await requestJson(
    `/api/v1/movies/${movieId}?include=director-profile`,
  );
  assert.equal(invalidInclude.status, 400);
  assert.deepEqual(invalidInclude.body, {
    error: {
      code: "VALIDATION_ERROR",
      message: 'include must be "director" when provided.',
    },
  });

  const directorDeleteConflict = await requestJson(
    `/api/v1/directors/${directorId}`,
    { method: "DELETE" },
  );
  assert.equal(directorDeleteConflict.status, 409);
  assert.deepEqual(directorDeleteConflict.body, {
    error: {
      code: "DIRECTOR_HAS_MOVIES",
      message: `Director ${directorId} cannot be deleted while movies reference it.`,
    },
  });

  const movieAfterConflict = await requestJson(`/api/v1/movies/${movieId}`);
  assert.equal(movieAfterConflict.status, 200);

  const deletedMovie = await requestJson(`/api/v1/movies/${movieId}`, {
    method: "DELETE",
  });
  assert.equal(deletedMovie.status, 204);
  assert.equal(await getJson<MovieResponse>(movieCacheKey(movieId)), null);
  assert.equal(await getJson<MovieResponse>(movieCacheKey(movieId, true)), null);
  assert.equal(await getJson<{ data: MovieResponse[] }>(await currentMovieListCacheKey()), null);
  assert.equal(
    await getJson<{ data: MovieResponse[] }>(await currentMovieListCacheKey({ includeDirector: true })),
    null,
  );

  const deletedDirector = await requestJson(`/api/v1/directors/${directorId}`, {
    method: "DELETE",
  });
  assert.equal(deletedDirector.status, 204);
});

test("rejects invalid movie input", async () => {
  const response = await requestJson("/api/v1/movies", {
    method: "POST",
    body: JSON.stringify({
      title: "Invalid movie",
      description: "Invalid data",
      releaseDate: "2020-01-01",
      genre: "Drama",
      rating: 11,
      imdbId: "tt9999999",
      directorId: "507f1f77bcf86cd799439011",
    }),
  });

  assert.equal(response.status, 400);
  assert.deepEqual(response.body, {
    error: {
      code: "VALIDATION_ERROR",
      message: "rating must be at most 10.",
    },
  });
});

test("returns not found when deleting a missing movie", async () => {
  const response = await requestJson(
    "/api/v1/movies/507f1f77bcf86cd799439011",
    {
      method: "DELETE",
    },
  );

  assert.equal(response.status, 404);
  assert.deepEqual(response.body, {
    error: {
      code: "MOVIE_NOT_FOUND",
      message: "Movie 507f1f77bcf86cd799439011 was not found.",
    },
  });
});

test("supports director reads, updates and movie expansion", async () => {
  const director = await requestJson("/api/v1/directors", {
    method: "POST",
    body: JSON.stringify({
      firstName: "Greta",
      secondName: "Gerwig",
      birthDate: "1983-08-04",
      bio: "American filmmaker and actor.",
    }),
  });

  assert.equal(director.status, 201);
  const directorId = resourceId(director.body);

  const directorById = await requestJson(
    `/api/v1/directors/${directorId}`,
  );
  assert.equal(directorById.status, 200);
  assert.equal(
    (directorById.body as { data: { id: string } }).data.id,
    directorId,
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(
      (directorById.body as { data: object }).data,
      "movies",
    ),
    false,
  );

  const directors = await requestJson("/api/v1/directors");
  assert.equal(directors.status, 200);
  assert.equal((directors.body as { data: unknown[] }).data.length, 1);

  const updatedDirector = await requestJson(
    `/api/v1/directors/${directorId}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        bio: "Updated filmmaker biography.",
        birthDate: "1983-08-05",
      }),
    },
  );
  assert.equal(updatedDirector.status, 200);
  assert.equal(
    (updatedDirector.body as { data: { bio: string; birthDate: string } }).data
      .bio,
    "Updated filmmaker biography.",
  );
  assert.equal(
    (updatedDirector.body as { data: { birthDate: string } }).data.birthDate,
    "1983-08-05",
  );

  const movie = await requestJson("/api/v1/movies", {
    method: "POST",
    body: JSON.stringify({
      title: "Barbie",
      description: "A doll leaves Barbieland for the real world.",
      releaseDate: "2023-07-21",
      genre: "Comedy",
      rating: 7,
      imdbId: "tt1517268",
      directorId,
    }),
  });
  assert.equal(movie.status, 201);

  const directorWithMovies = await requestJson(
    `/api/v1/directors/${directorId}?include=movies&moviesPage=1&moviesLimit=5`,
  );
  assert.equal(directorWithMovies.status, 200);
  const expandedDirector = directorWithMovies.body as {
    data: {
      movies: Array<{ title: string; directorId: string; director?: unknown }>;
      moviesMeta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrevious: boolean;
      };
    };
  };
  assert.equal(expandedDirector.data.movies.length, 1);
  assert.equal(expandedDirector.data.movies[0]?.title, "Barbie");
  assert.equal(expandedDirector.data.movies[0]?.directorId, directorId);
  assert.deepEqual(expandedDirector.data.moviesMeta, {
    page: 1,
    limit: 5,
    total: 1,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
  });
  assert.equal(
    Object.prototype.hasOwnProperty.call(
      expandedDirector.data.movies[0] ?? {},
      "director",
    ),
    false,
  );

  const directorsWithMovies = await requestJson(
    "/api/v1/directors?include=movies&moviesPage=1&moviesLimit=5",
  );
  assert.equal(directorsWithMovies.status, 200);
  assert.equal(
    (directorsWithMovies.body as { data: Array<{ movies: unknown[] }> }).data[0]
      ?.movies.length,
    1,
  );
  assert.deepEqual(
    (directorsWithMovies.body as { data: Array<{ moviesMeta: object }> }).data[0]
      ?.moviesMeta,
    {
      page: 1,
      limit: 5,
      total: 1,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
    },
  );

  const invalidInclude = await requestJson(
    `/api/v1/directors/${directorId}?include=filmography`,
  );
  assert.equal(invalidInclude.status, 400);
  assert.deepEqual(invalidInclude.body, {
    error: {
      code: "VALIDATION_ERROR",
      message: 'include must be "movies" when provided.',
    },
  });
});

test("invalidates expanded movie caches when a director is updated", async () => {
  const director = await requestJson("/api/v1/directors", {
    method: "POST",
    body: JSON.stringify({
      firstName: "Sofia",
      secondName: "Coppola",
      birthDate: "1971-05-14",
      bio: "American filmmaker.",
    }),
  });

  assert.equal(director.status, 201);
  const directorId = resourceId(director.body);

  const movieIds: string[] = [];
  for (const movieInput of [
    {
      title: "Lost in Translation",
      description: "Two strangers form an unexpected connection.",
      releaseDate: "2003-09-05",
      genre: "Drama",
      rating: 7.7,
      imdbId: "tt0335266",
    },
    {
      title: "The Virgin Suicides",
      description: "A family story observed through the eyes of neighborhood boys.",
      releaseDate: "1999-04-21",
      genre: "Drama",
      rating: 7.2,
      imdbId: "tt0159097",
    },
  ]) {
    const movie = await requestJson("/api/v1/movies", {
      method: "POST",
      body: JSON.stringify({ ...movieInput, directorId }),
    });

    assert.equal(movie.status, 201);
    movieIds.push(resourceId(movie.body));
  }

  for (const movieId of movieIds) {
    const expandedMovie = await requestJson(
      `/api/v1/movies/${movieId}?include=director`,
    );

    assert.equal(expandedMovie.status, 200);
    assert.equal(
      (expandedMovie.body as { data: { director: { firstName: string } } }).data
        .director.firstName,
      "Sofia",
    );
  }

  const expandedMovies = await requestJson(
    "/api/v1/movies?include=director",
  );
  assert.equal(expandedMovies.status, 200);
  assert.equal(
    (expandedMovies.body as { data: Array<{ director: { firstName: string } }> })
      .data.length,
    2,
  );

  for (const movieId of movieIds) {
    assert.notEqual(await getJson<MovieResponse>(movieCacheKey(movieId, true)), null);
  }
  assert.notEqual(
    await getJson<{ data: MovieResponse[] }>(await currentMovieListCacheKey({ includeDirector: true })),
    null,
  );
  const expandedMovieListVersionBeforeDirectorUpdate =
    await getMovieListCacheVersion(true);

  const updatedDirector = await requestJson(
    `/api/v1/directors/${directorId}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        firstName: "Sofia Maria",
      }),
    },
  );

  assert.equal(updatedDirector.status, 200);
  assert.equal(
    await getMovieListCacheVersion(true),
    expandedMovieListVersionBeforeDirectorUpdate + 1,
  );

  for (const movieId of movieIds) {
    assert.equal(await getJson<MovieResponse>(movieCacheKey(movieId, true)), null);
  }
  assert.equal(
    await getJson<{ data: MovieResponse[] }>(await currentMovieListCacheKey({ includeDirector: true })),
    null,
  );

  for (const movieId of movieIds) {
    const refreshedMovie = await requestJson(
      `/api/v1/movies/${movieId}?include=director`,
    );

    assert.equal(refreshedMovie.status, 200);
    assert.equal(
      (refreshedMovie.body as { data: { director: { firstName: string } } }).data
        .director.firstName,
      "Sofia Maria",
    );
  }

  const refreshedMovies = await requestJson(
    "/api/v1/movies?include=director",
  );
  assert.equal(refreshedMovies.status, 200);
  assert.equal(
    (refreshedMovies.body as { data: Array<{ director: { firstName: string } }> })
      .data.every((movie) => movie.director.firstName === "Sofia Maria"),
    true,
  );
});

test("registers, logs in and returns the current user", async () => {
  const credentials = {
    email: "new-user@example.com",
    password: "correct-horse-battery-staple",
  };
  const registration = await requestJson("/api/v1/auth/register", {
    auth: "none",
    method: "POST",
    body: JSON.stringify(credentials),
  });

  assert.equal(registration.status, 201);

  const registrationData = (
    registration.body as {
      data: {
        accessToken: string;
        refreshToken: string;
        user: { id: string; email: string; role: string };
      };
    }
  ).data;

  assert.equal(registrationData.user.email, credentials.email);
  assert.equal(registrationData.user.role, "user");
  assert.equal("passwordHash" in registrationData.user, false);

  const me = await requestJson("/api/v1/auth/me", {
    accessToken: registrationData.accessToken,
  });
  assert.equal(me.status, 200);
  assert.equal(
    (me.body as { data: { id: string } }).data.id,
    registrationData.user.id,
  );

  const login = await requestJson("/api/v1/auth/login", {
    auth: "none",
    method: "POST",
    body: JSON.stringify(credentials),
  });
  assert.equal(login.status, 200);

  const duplicateRegistration = await requestJson("/api/v1/auth/register", {
    auth: "none",
    method: "POST",
    body: JSON.stringify(credentials),
  });
  assert.equal(duplicateRegistration.status, 409);
});

test("rotates and revokes refresh tokens", async () => {
  const registration = await requestJson("/api/v1/auth/register", {
    auth: "none",
    method: "POST",
    body: JSON.stringify({
      email: "refresh-user@example.com",
      password: "correct-horse-battery-staple",
    }),
  });
  const firstSession = (
    registration.body as {
      data: { refreshToken: string; accessToken: string };
    }
  ).data;

  const refresh = await requestJson("/api/v1/auth/refresh", {
    auth: "none",
    method: "POST",
    body: JSON.stringify({ refreshToken: firstSession.refreshToken }),
  });
  assert.equal(refresh.status, 200);

  const secondSession = (
    refresh.body as {
      data: { refreshToken: string; accessToken: string };
    }
  ).data;
  assert.notEqual(secondSession.refreshToken, firstSession.refreshToken);

  const reusedToken = await requestJson("/api/v1/auth/refresh", {
    auth: "none",
    method: "POST",
    body: JSON.stringify({ refreshToken: firstSession.refreshToken }),
  });
  assert.equal(reusedToken.status, 401);

  const logout = await requestJson("/api/v1/auth/logout", {
    auth: "none",
    method: "POST",
    body: JSON.stringify({ refreshToken: secondSession.refreshToken }),
  });
  assert.equal(logout.status, 204);

  const revokedToken = await requestJson("/api/v1/auth/refresh", {
    auth: "none",
    method: "POST",
    body: JSON.stringify({ refreshToken: secondSession.refreshToken }),
  });
  assert.equal(revokedToken.status, 401);
});

test("protects writes and restricts deletes to admins", async () => {
  const publicDirectors = await requestJson("/api/v1/directors", {
    auth: "none",
  });
  assert.equal(publicDirectors.status, 200);

  const directorInput = {
    firstName: "Auth",
    secondName: "Test",
    birthDate: "1980-01-01",
    bio: "A director used for authentication authorization tests.",
  };

  const unauthenticatedCreate = await requestJson("/api/v1/directors", {
    auth: "none",
    method: "POST",
    body: JSON.stringify(directorInput),
  });
  assert.equal(unauthenticatedCreate.status, 401);

  const createdDirector = await requestJson("/api/v1/directors", {
    auth: "user",
    method: "POST",
    body: JSON.stringify(directorInput),
  });
  assert.equal(createdDirector.status, 201);

  const directorId = resourceId(createdDirector.body);
  const createdMovie = await requestJson("/api/v1/movies", {
    auth: "user",
    method: "POST",
    body: JSON.stringify({
      title: "Auth Test Movie",
      description: "A movie used for authentication authorization tests.",
      releaseDate: "2020-01-01",
      genre: "Drama",
      rating: 7.5,
      imdbId: "tt9900001",
      directorId,
    }),
  });
  assert.equal(createdMovie.status, 201);

  const movieId = resourceId(createdMovie.body);
  const forbiddenDelete = await requestJson(`/api/v1/movies/${movieId}`, {
    auth: "user",
    method: "DELETE",
  });
  assert.equal(forbiddenDelete.status, 403);

  const adminDelete = await requestJson(`/api/v1/movies/${movieId}`, {
    auth: "admin",
    method: "DELETE",
  });
  assert.equal(adminDelete.status, 204);

  const invalidMe = await requestJson("/api/v1/auth/me", {
    accessToken: "invalid-token",
  });
  assert.equal(invalidMe.status, 401);
});

test("paginates movie and director collection responses", async () => {
  const createDirector = async (firstName: string) => {
    const response = await requestJson("/api/v1/directors", {
      method: "POST",
      body: JSON.stringify({
        firstName,
        secondName: "Director",
        birthDate: "1980-01-01",
        bio: "A filmmaker.",
      }),
    });

    assert.equal(response.status, 201);
    return resourceId(response.body);
  };

  const directorId = await createDirector("Director A");
  await createDirector("Director B");
  await createDirector("Director C");

  const movieIds: string[] = [];
  for (const [index, movieInput] of [
    {
      title: "Movie One",
      description: "First paginated movie.",
      releaseDate: "2024-01-01",
      imdbId: "tt7000001",
    },
    {
      title: "Movie Two",
      description: "Second paginated movie.",
      releaseDate: "2023-01-01",
      imdbId: "tt7000002",
    },
    {
      title: "Movie Three",
      description: "Third paginated movie.",
      releaseDate: "2022-01-01",
      imdbId: "tt7000003",
    },
  ].entries()) {
    const movie = await requestJson("/api/v1/movies", {
      method: "POST",
      body: JSON.stringify({
        ...movieInput,
        genre: "Drama",
        rating: 8 - index / 10,
        directorId,
      }),
    });

    assert.equal(movie.status, 201);
    movieIds.push(resourceId(movie.body));
  }

  const firstMoviePage = await requestJson("/api/v1/movies?page=1&limit=2");
  assert.equal(firstMoviePage.status, 200);
  const firstMoviePageBody = firstMoviePage.body as {
    data: Array<{ title: string }>;
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrevious: boolean;
    };
  };
  assert.equal(firstMoviePageBody.data.length, 2);
  assert.deepEqual(firstMoviePageBody.meta, {
    page: 1,
    limit: 2,
    total: 3,
    totalPages: 2,
    hasNext: true,
    hasPrevious: false,
  });

  const secondMoviePage = await requestJson("/api/v1/movies?page=2&limit=2");
  assert.equal(secondMoviePage.status, 200);
  assert.equal(
    (secondMoviePage.body as { data: unknown[] }).data.length,
    1,
  );

  const expandedMoviePage = await requestJson(
    "/api/v1/movies?page=1&limit=2&include=director",
  );
  assert.equal(expandedMoviePage.status, 200);
  assert.equal(
    (
      expandedMoviePage.body as {
        data: Array<{ director: { id: string } }>;
      }
    ).data.every((movie) => movie.director.id === directorId),
    true,
  );

  assert.notEqual(
    await getJson<{ data: MovieResponse[] }>(
      await currentMovieListCacheKey({ page: 1, limit: 2 }),
    ),
    null,
  );
  assert.notEqual(
    await getJson<{ data: MovieResponse[] }>(
      await currentMovieListCacheKey({ page: 2, limit: 2 }),
    ),
    null,
  );
  assert.notEqual(
    await getJson<{ data: MovieResponse[] }>(
      await currentMovieListCacheKey({ page: 1, limit: 2, includeDirector: true }),
    ),
    null,
  );

  const directorsPage = await requestJson(
    "/api/v1/directors?page=2&limit=2",
  );
  assert.equal(directorsPage.status, 200);
  assert.equal(
    (directorsPage.body as { data: unknown[] }).data.length,
    1,
  );
  assert.deepEqual((directorsPage.body as { meta: object }).meta, {
    page: 2,
    limit: 2,
    total: 3,
    totalPages: 2,
    hasNext: false,
    hasPrevious: true,
  });

  const directorsWithMoviesPage = await requestJson(
    "/api/v1/directors?page=1&limit=2&include=movies",
  );
  assert.equal(directorsWithMoviesPage.status, 200);
  assert.equal(
    (directorsWithMoviesPage.body as { data: unknown[] }).data.length,
    2,
  );

  const nestedMoviesPage = await requestJson(
    "/api/v1/directors?page=1&limit=1&include=movies&moviesPage=2&moviesLimit=2",
  );
  assert.equal(nestedMoviesPage.status, 200);
  const nestedMoviesPageBody = nestedMoviesPage.body as {
    data: Array<{
      movies: Array<{ title: string }>;
      moviesMeta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrevious: boolean;
      };
    }>;
  };
  assert.equal(nestedMoviesPageBody.data.length, 1);
  assert.equal(nestedMoviesPageBody.data[0]?.movies.length, 1);
  assert.equal(nestedMoviesPageBody.data[0]?.movies[0]?.title, "Movie Three");
  assert.deepEqual(nestedMoviesPageBody.data[0]?.moviesMeta, {
    page: 2,
    limit: 2,
    total: 3,
    totalPages: 2,
    hasNext: false,
    hasPrevious: true,
  });

  const nestedMoviesDetailPage = await requestJson(
    `/api/v1/directors/${directorId}?include=movies&moviesPage=2&moviesLimit=2`,
  );
  assert.equal(nestedMoviesDetailPage.status, 200);
  assert.equal(
    (
      nestedMoviesDetailPage.body as {
        data: { movies: Array<{ title: string }> };
      }
    ).data.movies.length,
    1,
  );

  const normalMovieListVersionBeforeUpdate = await getMovieListCacheVersion();
  const expandedMovieListVersionBeforeUpdate =
    await getMovieListCacheVersion(true);

  const updatedMovie = await requestJson(`/api/v1/movies/${movieIds[0]}`, {
    method: "PATCH",
    body: JSON.stringify({ rating: 9 }),
  });
  assert.equal(updatedMovie.status, 200);
  assert.equal(
    await getMovieListCacheVersion(),
    normalMovieListVersionBeforeUpdate + 1,
  );
  assert.equal(
    await getMovieListCacheVersion(true),
    expandedMovieListVersionBeforeUpdate + 1,
  );
  assert.equal(
    await getJson<{ data: MovieResponse[] }>(
      await currentMovieListCacheKey({ page: 1, limit: 2 }),
    ),
    null,
  );
  assert.equal(
    await getJson<{ data: MovieResponse[] }>(
      await currentMovieListCacheKey({ page: 2, limit: 2 }),
    ),
    null,
  );
  assert.equal(
    await getJson<{ data: MovieResponse[] }>(
      await currentMovieListCacheKey({ page: 1, limit: 2, includeDirector: true }),
    ),
    null,
  );
});
