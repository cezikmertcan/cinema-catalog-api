import { z } from "zod";
import {
  paginationQuerySchema,
  parseSchema,
  requiredString,
  strictDate,
} from "../../shared/validation/request-validation";
import { resolvePagination, type PaginationOptions } from "../../shared/pagination/pagination";
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

const directorListQuerySchema = paginationQuerySchema
  .extend({
    include: z.literal("movies").optional(),
  })
  .strict();

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
}

export const parseDirectorListQuery = (
  query: unknown,
): DirectorListQuery => {
  const parsed = parseSchema(directorListQuerySchema, query);

  return {
    includeMovies: parsed.include !== undefined,
    pagination: resolvePagination(parsed),
  };
};
