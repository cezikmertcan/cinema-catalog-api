import { randomBytes, randomUUID } from "node:crypto";
import argon2 from "argon2";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { env } from "../../config/env";
import { AppError } from "../../shared/errors/app-error";
import type { AccessTokenClaims } from "./auth.types";
import type { UserRole } from "./user.model";

export const hashPassword = async (password: string): Promise<string> => {
  return argon2.hash(password, {
    type: argon2.argon2id,
  });
};

export const verifyPassword = async (
  password: string,
  passwordHash: string,
): Promise<boolean> => {
  return argon2.verify(passwordHash, password);
};

export const createAccessToken = (input: AccessTokenClaims): string => {
  return jwt.sign(
    {
      sub: input.userId,
      role: input.role,
      jti: randomUUID(),
    },
    env.authJwtSecret,
    {
      algorithm: "HS256",
      expiresIn: env.authAccessTokenTtlSeconds,
      issuer: env.authJwtIssuer,
      audience: env.authJwtAudience,
    },
  );
};

export const createRefreshToken = (): string => {
  return randomBytes(32).toString("base64url");
};

export const verifyAccessToken = (token: string): AccessTokenClaims => {
  let payload: string | JwtPayload;

  try {
    payload = jwt.verify(token, env.authJwtSecret, {
      algorithms: ["HS256"],
      issuer: env.authJwtIssuer,
      audience: env.authJwtAudience,
    });
  } catch {
    throw new AppError(
      401,
      "INVALID_ACCESS_TOKEN",
      "The access token is invalid or expired.",
    );
  }

  if (
    typeof payload === "string" ||
    typeof payload.sub !== "string" ||
    (payload.role !== "user" && payload.role !== "admin")
  ) {
    throw new AppError(
      401,
      "INVALID_ACCESS_TOKEN",
      "The access token is invalid or expired.",
    );
  }

  return {
    userId: payload.sub,
    role: payload.role as UserRole,
  };
};
