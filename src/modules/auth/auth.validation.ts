import { z } from "zod";
import { parseSchema } from "../../shared/validation/request-validation";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .email("email must be a valid email address.")
  .max(320, "email must be at most 320 characters.");

const password = z
  .string()
  .min(12, "password must be at least 12 characters.")
  .max(128, "password must be at most 128 characters.");

const credentialsSchema = z
  .object({
    email,
    password,
  })
  .strict();

const refreshTokenSchema = z
  .object({
    refreshToken: z
      .string()
      .min(32, "refreshToken is invalid.")
      .max(512, "refreshToken is invalid."),
  })
  .strict();

export interface CredentialsInput {
  email: string;
  password: string;
}

export const parseCredentials = (body: unknown): CredentialsInput => {
  return parseSchema(credentialsSchema, body);
};

export const parseRefreshToken = (body: unknown): string => {
  return parseSchema(refreshTokenSchema, body).refreshToken;
};
