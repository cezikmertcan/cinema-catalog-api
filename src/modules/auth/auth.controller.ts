import type { RequestHandler } from "express";
import { asyncHandler } from "../../shared/http/async-handler";
import { AppError } from "../../shared/errors/app-error";
import {
  getCurrentUser,
  login as loginUser,
  logout as logoutUser,
  refresh as refreshSession,
  register as registerUser,
} from "./auth.service";
import {
  parseCredentials,
  parseRefreshToken,
} from "./auth.validation";

const authenticatedUserRequired = (): AppError => {
  return new AppError(
    401,
    "AUTHENTICATION_REQUIRED",
    "A valid Bearer access token is required.",
  );
};

const register: RequestHandler = async (request, response) => {
  const session = await registerUser(parseCredentials(request.body));

  response.status(201).json({
    data: session,
  });
};

const login: RequestHandler = async (request, response) => {
  const session = await loginUser(parseCredentials(request.body));

  response.status(200).json({
    data: session,
  });
};

const refresh: RequestHandler = async (request, response) => {
  const session = await refreshSession(parseRefreshToken(request.body));

  response.status(200).json({
    data: session,
  });
};

const logout: RequestHandler = async (request, response) => {
  await logoutUser(parseRefreshToken(request.body));
  response.status(204).send();
};

const me: RequestHandler = async (request, response) => {
  if (request.auth === undefined) {
    throw authenticatedUserRequired();
  }

  const user = await getCurrentUser(request.auth);

  response.status(200).json({
    data: user,
  });
};

export const registerHandler = asyncHandler(register);
export const loginHandler = asyncHandler(login);
export const refreshHandler = asyncHandler(refresh);
export const logoutHandler = asyncHandler(logout);
export const meHandler = asyncHandler(me);
