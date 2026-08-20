import { env } from "../../config/env";
import { AppError } from "../../shared/errors/app-error";
import {
  getRefreshSession,
  revokeRefreshSession,
  rotateRefreshSession,
  saveRefreshSession,
} from "./auth.cache";
import {
  createAccessToken,
  createRefreshToken,
  hashPassword,
  verifyPassword,
} from "./auth.token";
import type { AccessTokenClaims, AuthenticatedUser } from "./auth.types";
import { serializeUser, type UserResponse } from "./user.serializer";
import {
  findUserByEmail,
  findUserById,
  insertUser,
} from "./user.repository";
import type { UserDocument } from "./user.model";

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
}

export interface AuthSessionResponse extends AuthTokensResponse {
  user: UserResponse;
}

const invalidCredentialsError = (): AppError => {
  return new AppError(
    401,
    "INVALID_CREDENTIALS",
    "Email or password is incorrect.",
  );
};

const authCacheError = (): AppError => {
  return new AppError(
    503,
    "AUTH_CACHE_UNAVAILABLE",
    "Authentication service is temporarily unavailable.",
  );
};

const invalidRefreshTokenError = (): AppError => {
  return new AppError(
    401,
    "INVALID_REFRESH_TOKEN",
    "The refresh token is invalid or expired.",
  );
};

const issueTokens = async (
  user: UserDocument,
): Promise<AuthTokensResponse> => {
  const accessTokenInput: AccessTokenClaims = {
    userId: user._id.toString(),
    role: user.role,
  };
  const accessToken = createAccessToken(accessTokenInput);
  const refreshToken = createRefreshToken();

  try {
    await saveRefreshSession(refreshToken, {
      userId: user._id.toString(),
    });
  } catch (error) {
    console.error("Failed to store the refresh session.", error);
    throw authCacheError();
  }

  return {
    accessToken,
    refreshToken,
    tokenType: "Bearer",
    expiresIn: env.authAccessTokenTtlSeconds,
  };
};

const ensureActiveUser = async (userId: string): Promise<UserDocument> => {
  const user = await findUserById(userId);

  if (user === null || user.isActive !== true) {
    throw new AppError(
      401,
      "AUTHENTICATION_REQUIRED",
      "The authenticated user is not active.",
    );
  }

  return user;
};

export const register = async (input: {
  email: string;
  password: string;
}): Promise<AuthSessionResponse> => {
  const existingUser = await findUserByEmail(input.email);

  if (existingUser !== null) {
    throw new AppError(
      409,
      "EMAIL_ALREADY_REGISTERED",
      "An account with this email already exists.",
    );
  }

  const user = await insertUser({
    email: input.email,
    passwordHash: await hashPassword(input.password),
  });
  const tokens = await issueTokens(user);

  return {
    ...tokens,
    user: serializeUser(user),
  };
};

export const login = async (input: {
  email: string;
  password: string;
}): Promise<AuthSessionResponse> => {
  const user = await findUserByEmail(input.email, true);

  if (user === null || user.isActive !== true) {
    throw invalidCredentialsError();
  }

  let passwordMatches = false;

  try {
    passwordMatches = await verifyPassword(input.password, user.passwordHash);
  } catch (error) {
    console.error("Failed to verify the password hash.", error);
  }

  if (!passwordMatches) {
    throw invalidCredentialsError();
  }

  const tokens = await issueTokens(user);

  return {
    ...tokens,
    user: serializeUser(user),
  };
};

export const refresh = async (
  refreshToken: string,
): Promise<AuthSessionResponse> => {
  let session;

  try {
    session = await getRefreshSession(refreshToken);
  } catch (error) {
    console.error("Failed to read the refresh session.", error);
    throw authCacheError();
  }

  if (session === null) {
    throw invalidRefreshTokenError();
  }

  let user: UserDocument;

  try {
    user = await ensureActiveUser(session.userId);
  } catch (error) {
    if (error instanceof AppError && error.code === "AUTHENTICATION_REQUIRED") {
      throw invalidRefreshTokenError();
    }

    throw error;
  }
  const nextRefreshToken = createRefreshToken();
  const tokens: AuthTokensResponse = {
    accessToken: createAccessToken({
      userId: user._id.toString(),
      role: user.role,
    }),
    refreshToken: nextRefreshToken,
    tokenType: "Bearer",
    expiresIn: env.authAccessTokenTtlSeconds,
  };

  try {
    await rotateRefreshSession({
      previousToken: refreshToken,
      nextToken: nextRefreshToken,
      session: {
        userId: user._id.toString(),
      },
    });
  } catch (error) {
    console.error("Failed to rotate the refresh session.", error);
    throw authCacheError();
  }

  return {
    ...tokens,
    user: serializeUser(user),
  };
};

export const logout = async (refreshToken: string): Promise<void> => {
  try {
    await revokeRefreshSession(refreshToken);
  } catch (error) {
    console.error("Failed to revoke the refresh session.", error);
    throw authCacheError();
  }
};

export const getCurrentUser = async (
  authenticatedUser: AuthenticatedUser,
): Promise<UserResponse> => {
  const user = await ensureActiveUser(authenticatedUser.userId);
  return serializeUser(user);
};
