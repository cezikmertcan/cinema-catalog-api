import { z } from "zod";
import {
  paginationQuerySchema,
  parseSchema,
  positiveIntegerQuery,
  requiredString,
  strictDate,
} from "../../shared/validation/request-validation";
import {
  maxLimit,
  resolvePagination,
  type PaginationOptions,
} from "../../shared/pagination/pagination";
import type {
  CreateDirectorInput,
  UpdateDirectorInput,
} from "./director.types";

const directorSchema = z
  .object({
    firstName: requiredString("firstName", 100),
    secondName: requiredString("secondName", 100),
    birthDate: strictDate(),
    bio: requiredString("bio", 5000),
  })
  .strict();

const directorUpdateSchema = directorSchema
  .partial()
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one director field must be provided for update.",
  });

const directorQuerySchema = paginationQuerySchema
  .extend({
    include: z
      .string()
      .refine((value) => value === "movies", {
        message: 'include must be "movies" when provided.',
      })
      .optional(),
    moviesPage: positiveIntegerQuery("moviesPage").optional(),
    moviesLimit: positiveIntegerQuery("moviesLimit")
      .refine(
        (value) => value <= maxLimit,
        `moviesLimit must be at most ${maxLimit}.`,
      )
      .optional(),
  })
  .strict()
  .superRefine((query, context) => {
    const hasNestedPagination =
      query.moviesPage !== undefined || query.moviesLimit !== undefined;

    if (hasNestedPagination && query.include !== "movies") {
      context.addIssue({
        code: "custom",
        path: ["include"],
        message: "moviesPage and moviesLimit require include=movies.",
      });
    }
  });

export const parseCreateDirector = (
  body: unknown,
): CreateDirectorInput => {
  return parseSchema(directorSchema, body);
};

export const parseUpdateDirector = (
  body: unknown,
): UpdateDirectorInput => {
  return parseSchema(directorUpdateSchema, body);
};

export const parseIncludeMovies = (value: unknown): boolean => {
  if (value === undefined) {
    return false;
  }

  parseSchema(z.literal("movies"), value, {
    errorMessage: 'include must be "movies" when provided.',
  });

  return true;
};

export interface DirectorListQuery {
  includeMovies: boolean;
  pagination: PaginationOptions;
  moviesPagination?: PaginationOptions;
}

export interface DirectorQuery {
  includeMovies: boolean;
  moviesPagination?: PaginationOptions;
}

const parseDirectorQueryInput = (query: unknown) => {
  const parsed = parseSchema(directorQuerySchema, query);
  const includeMovies = parsed.include !== undefined;

  return {
    includeMovies,
    moviesPagination: includeMovies
      ? resolvePagination({
          page: parsed.moviesPage,
          limit: parsed.moviesLimit,
        })
      : undefined,
  };
};

export const parseDirectorQuery = (query: unknown): DirectorQuery => {
  return parseDirectorQueryInput(query);
};

export const parseDirectorListQuery = (
  query: unknown,
): DirectorListQuery => {
  const parsed = parseSchema(directorQuerySchema, query);
  const directorQuery = parseDirectorQueryInput(query);

  return {
    includeMovies: directorQuery.includeMovies,
    pagination: resolvePagination(parsed),
    moviesPagination: directorQuery.moviesPagination,
  };
};
