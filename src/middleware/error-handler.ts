import type { ErrorRequestHandler } from "express";
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
