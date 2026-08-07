import type { ErrorRequestHandler } from "express";
import mongoose from "mongoose";
import { AppError } from "../shared/errors/app-error";

type MalformedJsonError = SyntaxError & {
  type?: string;
};

const isMalformedJsonError = (
  error: unknown,
): error is MalformedJsonError => {
  if (!(error instanceof SyntaxError)) {
    return false;
  }

  return (error as MalformedJsonError).type === "entity.parse.failed";
};

const isDuplicateKeyError = (
  error: unknown,
): error is { code: number; keyValue?: Record<string, unknown> } => {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  return "code" in error && (error as { code?: unknown }).code === 11000;
};

const validationDetails = (error: mongoose.Error.ValidationError) => {
  return Object.entries(error.errors).map(([field, fieldError]) => ({
    field,
    message: fieldError.message,
  }));
};

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  next,
) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (isMalformedJsonError(error)) {
    response.status(400).json({
      error: {
        code: "INVALID_JSON",
        message: "Request body contains invalid JSON.",
      },
    });
    return;
  }

  if (isDuplicateKeyError(error)) {
    response.status(409).json({
      error: {
        code: "RESOURCE_CONFLICT",
        message: "A resource with the same unique value already exists.",
      },
    });
    return;
  }

  if (error instanceof mongoose.Error.ValidationError) {
    response.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request data is invalid.",
        details: validationDetails(error),
      },
    });
    return;
  }

  if (error instanceof mongoose.Error.CastError) {
    response.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request contains an invalid value.",
        details: [{ field: error.path, message: error.message }],
      },
    });
    return;
  }

  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
      },
    });
    return;
  }

  console.error(error);

  response.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred.",
    },
  });
};
