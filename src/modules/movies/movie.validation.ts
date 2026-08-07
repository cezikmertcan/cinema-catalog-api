import {
  assertAllowedFields,
  assertAtLeastOneField,
  hasField,
  parseObjectBody,
  readDate,
  readNumber,
  readObjectId,
  readString,
  type JsonObject,
} from "../../shared/validation/request-validation";
import type { CreateMovieInput, UpdateMovieInput } from "./movie.types";

const movieFields = [
  "title",
  "description",
  "releaseDate",
  "genre",
  "rating",
  "imdbId",
  "directorId",
] as const;

const imdbIdPattern = /^tt\d+$/;

const readImdbId = (input: JsonObject): string => {
  return readString(input, "imdbId", {
    maxLength: 20,
    pattern: imdbIdPattern,
    patternMessage: "imdbId must be a valid IMDb identifier.",
  });
};

export const parseCreateMovie = (body: unknown): CreateMovieInput => {
  const input = parseObjectBody(body);
  assertAllowedFields(input, movieFields);

  return {
    title: readString(input, "title", { maxLength: 200 }),
    description: readString(input, "description", { maxLength: 5000 }),
    releaseDate: readDate(input, "releaseDate"),
    genre: readString(input, "genre", { maxLength: 100 }),
    rating: readNumber(input, "rating", { min: 0, max: 10 }),
    imdbId: readImdbId(input),
    directorId: readObjectId(input.directorId, "directorId"),
  };
};

export const parseUpdateMovie = (body: unknown): UpdateMovieInput => {
  const input = parseObjectBody(body);
  assertAllowedFields(input, movieFields);

  const update: UpdateMovieInput = {};

  if (hasField(input, "title")) {
    update.title = readString(input, "title", { maxLength: 200 });
  }

  if (hasField(input, "description")) {
    update.description = readString(input, "description", { maxLength: 5000 });
  }

  if (hasField(input, "releaseDate")) {
    update.releaseDate = readDate(input, "releaseDate");
  }

  if (hasField(input, "genre")) {
    update.genre = readString(input, "genre", { maxLength: 100 });
  }

  if (hasField(input, "rating")) {
    update.rating = readNumber(input, "rating", { min: 0, max: 10 });
  }

  if (hasField(input, "imdbId")) {
    update.imdbId = readImdbId(input);
  }

  if (hasField(input, "directorId")) {
    update.directorId = readObjectId(input.directorId, "directorId");
  }

  assertAtLeastOneField(update, "At least one movie field must be provided for update.");

  return update;
};
