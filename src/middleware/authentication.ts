import type { RequestHandler } from "express";
import { asyncHandler } from "../shared/http/async-handler";
import { AppError } from "../shared/errors/app-error";
import { verifyAccessToken } from "../modules/auth/auth.token";
import { findUserById } from "../modules/auth/user.repository";
import type { UserRole } from "../modules/auth/user.model";

const authenticationRequired = (): AppError => {
  return new AppError(
    401,
    "AUTHENTICATION_REQUIRED",
    "A valid Bearer access token is required.",
  );
};

const getBearerToken = (authorizationHeader: string | undefined): string => {
  if (authorizationHeader === undefined) {
    throw authenticationRequired();
  }

  const [scheme, token, ...extraParts] = authorizationHeader.split(" ");

  if (
    scheme?.toLowerCase() !== "bearer" ||
    token === undefined ||
    token.length === 0 ||
    extraParts.length > 0
  ) {
    throw authenticationRequired();
  }

  return token;
};

const authenticateHandler: RequestHandler = async (request, _response, next) => {
  const token = getBearerToken(request.header("authorization"));
  const claims = verifyAccessToken(token);
  const user = await findUserById(claims.userId);

  if (user === null || user.isActive !== true) {
    throw authenticationRequired();
  }

  request.auth = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  };

  next();
};

export const authenticate: RequestHandler = asyncHandler(authenticateHandler);

export const requireRole = (...roles: UserRole[]): RequestHandler => {
  return (request, _response, next) => {
    if (request.auth === undefined) {
      next(authenticationRequired());
      return;
    }

    if (!roles.includes(request.auth.role)) {
      next(
        new AppError(
          403,
          "FORBIDDEN",
          "You do not have permission to perform this action.",
        ),
      );
      return;
    }

    next();
  };
};
