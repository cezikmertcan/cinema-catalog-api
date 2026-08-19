import { Types } from "mongoose";
import { z, type ZodType } from "zod";
import { AppError } from "../errors/app-error";
import { maxLimit } from "../pagination/pagination";

const validationError = (message: string, details?: unknown): AppError => {
  return new AppError(400, "VALIDATION_ERROR", message, details);
};

type ParseSchemaOptions = {
  errorMessage?: string;
};

const fieldName = (path: readonly PropertyKey[]): string => {
  const firstPathPart = path[0];

  return typeof firstPathPart === "string" ? firstPathPart : "Request body";
};

const validationMessageForIssue = (
  issue: z.core.$ZodIssue,
): { message: string; details?: unknown } => {
  if (issue.code === "unrecognized_keys") {
    return {
      message: "Request contains unsupported fields.",
      details: {
        fields: issue.keys,
      },
    };
  }

  if (issue.code === "invalid_type") {
    if (issue.path.length === 0) {
      return {
        message: "Request body must be a JSON object.",
      };
    }

    const name = fieldName(issue.path);

    if (issue.expected === "string") {
      return {
        message: `${name} is required and must be a non-empty string.`,
      };
    }

    if (issue.expected === "number") {
      return {
        message: `${name} is required and must be a number.`,
      };
    }

    if (issue.expected === "object") {
      return {
        message: "Request body must be a JSON object.",
      };
    }
  }

  if ("format" in issue && issue.format === "date") {
    return {
      message: `${fieldName(issue.path)} must be a valid date in YYYY-MM-DD format.`,
    };
  }

  return {
    message: issue.message,
  };
};

export const parseSchema = <T>(
  schema: ZodType<T>,
  input: unknown,
  options: ParseSchemaOptions = {},
): T => {
  const result = schema.safeParse(input);

  if (result.success) {
    return result.data;
  }

  if (options.errorMessage !== undefined) {
    throw validationError(options.errorMessage);
  }

  const firstIssue = result.error.issues[0];

  if (firstIssue === undefined) {
    throw validationError("Request data is invalid.");
  }

  const validationMessage = validationMessageForIssue(firstIssue);
  throw validationError(
    validationMessage.message,
    validationMessage.details,
  );
};

export const requiredString = (field: string, maxLength: number) =>
  z
    .string()
    .trim()
    .min(1, `${field} is required and must be a non-empty string.`)
    .max(
      maxLength,
      `${field} must be at most ${maxLength} characters long.`,
    );

export const strictDate = () =>
  z.iso.date().transform((value) => new Date(`${value}T00:00:00.000Z`));

export const boundedNumber = (field: string, min: number, max: number) =>
  z
    .number()
    .finite(`${field} must be a finite number.`)
    .min(min, `${field} must be at least ${min}.`)
    .max(max, `${field} must be at most ${max}.`);

export const objectIdSchema = (field: string) =>
  z
    .string()
    .regex(/^[a-f\d]{24}$/i, `${field} must be a valid identifier.`);

export const readObjectId = (value: unknown, field: string): string => {
  const result = objectIdSchema(field).safeParse(value);

  if (!result.success) {
    throw new AppError(
      400,
      "INVALID_ID",
      `${field} must be a valid identifier.`,
    );
  }

  return result.data;
};

export const toObjectId = (value: string): Types.ObjectId => {
  return new Types.ObjectId(value);
};

export const positiveIntegerQuery = (field: string) =>
  z
    .string()
    .regex(/^[1-9]\d*$/, `${field} must be a positive integer.`)
    .transform(Number)
    .refine(Number.isSafeInteger, `${field} must be a safe integer.`);

export const paginationQuerySchema = z
  .object({
    page: positiveIntegerQuery("page").optional(),
    limit: positiveIntegerQuery("limit")
      .refine(
        (value) => value <= maxLimit,
        `limit must be at most ${maxLimit}.`,
      )
      .optional(),
  })
  .strict();
