import { z } from "zod";
import {
  boundedNumber,
  objectIdSchema,
  parseSchema,
  requiredString,
  strictDate,
} from "../../shared/validation/request-validation";
import type { CreateMovieInput, UpdateMovieInput } from "./movie.types";

const movieSchema = z
  .object({
    title: requiredString("title", 200),
    description: requiredString("description", 5000),
    releaseDate: strictDate(),
    genre: requiredString("genre", 100),
    rating: boundedNumber("rating", 0, 10),
    imdbId: requiredString("imdbId", 20).regex(
      /^tt\d+$/,
      "imdbId must be a valid IMDb identifier.",
    ),
    directorId: objectIdSchema("directorId"),
  })
  .strict();

const movieUpdateSchema = movieSchema
  .partial()
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one movie field must be provided for update.",
  });

export const parseCreateMovie = (body: unknown): CreateMovieInput => {
  return parseSchema(movieSchema, body);
};

export const parseUpdateMovie = (body: unknown): UpdateMovieInput => {
  return parseSchema(movieUpdateSchema, body);
};

export const parseIncludeDirector = (value: unknown): boolean => {
  if (value === undefined) {
    return false;
  }

  parseSchema(z.literal("director"), value, {
    errorMessage: 'include must be "director" when provided.',
  });

  return true;
};
