import { strict as assert } from "node:assert";
import { test } from "node:test";
import { AppError } from "../src/shared/errors/app-error";
import { DirectorModel } from "../src/modules/directors/director.model";
import {
  parseCreateDirector,
  parseDirectorQuery,
  parseDirectorListQuery,
  parseIncludeMovies,
  parseUpdateDirector,
} from "../src/modules/directors/director.validation";
import {
  parseCreateMovie,
  parseIncludeDirector,
  parseMovieListQuery,
  parseUpdateMovie,
} from "../src/modules/movies/movie.validation";
import { MovieModel } from "../src/modules/movies/movie.model";

const directorInput = {
  firstName: "Christopher",
  secondName: "Nolan",
  birthDate: "1970-07-30",
  bio: "British-American filmmaker.",
};

const movieInput = {
  title: "Inception",
  description: "A professional thief who steals secrets through dreams.",
  releaseDate: "2010-07-16",
  genre: "Science Fiction",
  rating: 8.8,
  imdbId: "tt1375666",
  directorId: "507f1f77bcf86cd799439011",
};

const assertValidationError = (
  callback: () => unknown,
  message: string,
): void => {
  assert.throws(callback, (error: unknown) => {
    return (
      error instanceof AppError &&
      error.statusCode === 400 &&
      error.code === "VALIDATION_ERROR" &&
      error.message === message
    );
  });
};

test("parses strict calendar dates as UTC dates", () => {
  const director = parseCreateDirector(directorInput);

  assert.equal(
    director.birthDate.toISOString(),
    "1970-07-30T00:00:00.000Z",
  );
});

test("rejects non-ISO and impossible calendar dates", () => {
  for (const birthDate of ["1970-7-30", "1970-02-30", "July 30, 1970"]) {
    assertValidationError(
      () => parseCreateDirector({ ...directorInput, birthDate }),
      "birthDate must be a valid date in YYYY-MM-DD format.",
    );
  }
});

test("trims strings and preserves decimal numbers", () => {
  const movie = parseCreateMovie({
    ...movieInput,
    title: "  Inception  ",
    rating: 8.8,
  });

  assert.equal(movie.title, "Inception");
  assert.equal(movie.rating, 8.8);
  assert.equal(movie.releaseDate.toISOString(), "2010-07-16T00:00:00.000Z");
});

test("rejects invalid number ranges and unsupported fields", () => {
  assertValidationError(
    () => parseCreateMovie({ ...movieInput, rating: 10.1 }),
    "rating must be at most 10.",
  );

  let unknownFieldError: unknown;

  try {
    parseCreateMovie({ ...movieInput, unsupported: true });
  } catch (error: unknown) {
    unknownFieldError = error;
  }

  assert.ok(unknownFieldError instanceof AppError);

  assert.equal(unknownFieldError.code, "VALIDATION_ERROR");
  assert.deepEqual(unknownFieldError.details, {
    fields: ["unsupported"],
  });
});

test("keeps partial updates strict and validates include values", () => {
  assert.deepEqual(parseUpdateMovie({ rating: 9 }), { rating: 9 });

  assertValidationError(
    () => parseUpdateMovie({}),
    "At least one movie field must be provided for update.",
  );

  assert.equal(parseIncludeDirector(undefined), false);
  assert.equal(parseIncludeDirector("director"), true);
  assertValidationError(
    () => parseIncludeDirector("director-profile"),
    'include must be "director" when provided.',
  );
});

test("validates director updates and movie includes", () => {
  assert.deepEqual(parseUpdateDirector({ bio: "Updated biography." }), {
    bio: "Updated biography.",
  });

  assertValidationError(
    () => parseUpdateDirector({}),
    "At least one director field must be provided for update.",
  );

  assert.equal(parseIncludeMovies(undefined), false);
  assert.equal(parseIncludeMovies("movies"), true);
  assertValidationError(
    () => parseIncludeMovies("filmography"),
    'include must be "movies" when provided.',
  );
});

test("parses and validates collection pagination", () => {
  assert.deepEqual(parseMovieListQuery({}), {
    includeDirector: false,
    pagination: { page: 1, limit: 20 },
  });
  assert.deepEqual(
    parseDirectorListQuery({
      include: "movies",
      page: "2",
      limit: "50",
      moviesPage: "3",
      moviesLimit: "10",
    }),
    {
      includeMovies: true,
      pagination: { page: 2, limit: 50 },
      moviesPagination: { page: 3, limit: 10 },
    },
  );
  assert.deepEqual(parseDirectorQuery({ include: "movies" }), {
    includeMovies: true,
    moviesPagination: { page: 1, limit: 20 },
  });

  assertValidationError(
    () => parseMovieListQuery({ page: "0" }),
    "page must be a positive integer.",
  );
  assertValidationError(
    () => parseDirectorListQuery({ limit: "101" }),
    "limit must be at most 100.",
  );
  assertValidationError(
    () => parseMovieListQuery({ page: "1.5" }),
    "page must be a positive integer.",
  );
  assertValidationError(
    () => parseDirectorListQuery({ page: "1", unsupported: "value" }),
    "Request contains unsupported fields.",
  );
  assertValidationError(
    () => parseDirectorQuery({ include: "movies", moviesLimit: "101" }),
    "moviesLimit must be at most 100.",
  );
  assertValidationError(
    () => parseDirectorQuery({ moviesPage: "2" }),
    "moviesPage and moviesLimit require include=movies.",
  );
});

test("declares compound indexes for collection and relation queries", () => {
  const directorIndexes = DirectorModel.schema.indexes();
  const movieIndexes = MovieModel.schema.indexes();

  assert.ok(
    directorIndexes.some(
      ([fields]) =>
        JSON.stringify(fields) ===
        JSON.stringify({ firstName: 1, secondName: 1 }),
    ),
  );
  assert.ok(
    movieIndexes.some(
      ([fields]) =>
        JSON.stringify(fields) ===
        JSON.stringify({ releaseDate: -1, title: 1 }),
    ),
  );
  assert.ok(
    movieIndexes.some(
      ([fields]) =>
        JSON.stringify(fields) ===
        JSON.stringify({ directorId: 1, releaseDate: -1, title: 1 }),
    ),
  );
});
