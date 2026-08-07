import { Types } from "mongoose";
import { AppError } from "../errors/app-error";

export type JsonObject = Record<string, unknown>;

type StringOptions = {
  maxLength?: number;
  pattern?: RegExp;
  patternMessage?: string;
};

const validationError = (message: string, details?: unknown): AppError => {
  return new AppError(400, "VALIDATION_ERROR", message, details);
};

export const parseObjectBody = (body: unknown): JsonObject => {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw validationError("Request body must be a JSON object.");
  }

  return body as JsonObject;
};

export const assertAllowedFields = (
  body: JsonObject,
  allowedFields: readonly string[],
): void => {
  const unknownFields = Object.keys(body).filter(
    (field) => !allowedFields.includes(field),
  );

  if (unknownFields.length > 0) {
    throw validationError("Request contains unsupported fields.", {
      fields: unknownFields,
    });
  }
};

export const hasField = (body: JsonObject, field: string): boolean => {
  return Object.prototype.hasOwnProperty.call(body, field);
};

export const readString = (
  body: JsonObject,
  field: string,
  options: StringOptions = {},
): string => {
  const value = body[field];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw validationError(
      `${field} is required and must be a non-empty string.`,
    );
  }

  const normalizedValue = value.trim();

  if (
    options.maxLength !== undefined &&
    normalizedValue.length > options.maxLength
  ) {
    throw validationError(`${field} must be at most ${options.maxLength} characters long.`);
  }

  if (options.pattern !== undefined && !options.pattern.test(normalizedValue)) {
    throw validationError(
      options.patternMessage ?? `${field} has an invalid format.`,
    );
  }

  return normalizedValue;
};

export const readDate = (body: JsonObject, field: string): Date => {
  const value = body[field];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw validationError(`${field} is required and must be a valid date.`);
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    throw validationError(`${field} is required and must be a valid date.`);
  }

  return parsedDate;
};

export const readNumber = (
  body: JsonObject,
  field: string,
  options: { min?: number; max?: number } = {},
): number => {
  const value = body[field];

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw validationError(`${field} is required and must be a number.`);
  }

  if (options.min !== undefined && value < options.min) {
    throw validationError(`${field} must be at least ${options.min}.`);
  }

  if (options.max !== undefined && value > options.max) {
    throw validationError(`${field} must be at most ${options.max}.`);
  }

  return value;
};

export const readObjectId = (value: unknown, field: string): string => {
  if (typeof value !== "string" || !/^[a-f\d]{24}$/i.test(value)) {
    throw new AppError(400, "INVALID_ID", `${field} must be a valid identifier.`);
  }

  return value;
};

export const assertAtLeastOneField = (
  input: JsonObject,
  message = "At least one field must be provided.",
): void => {
  if (Object.keys(input).length === 0) {
    throw validationError(message);
  }
};

export const toObjectId = (value: string): Types.ObjectId => {
  return new Types.ObjectId(value);
};
