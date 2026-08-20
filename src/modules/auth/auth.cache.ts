import { createHash } from "node:crypto";
import { env } from "../../config/env";
import {
  deleteKeyRequired,
  getJsonRequired,
  rotateJsonKey,
  setJsonRequired,
} from "../../infrastructure/cache/redis";
import type { RefreshSession } from "./auth.types";

const refreshKeyPrefix = `${env.authRedisPrefix}:refresh`;

const hashToken = (token: string): string => {
  return createHash("sha256").update(token).digest("hex");
};

export const refreshSessionKey = (refreshToken: string): string => {
  return `${refreshKeyPrefix}:${hashToken(refreshToken)}`;
};

export const saveRefreshSession = async (
  refreshToken: string,
  session: RefreshSession,
): Promise<void> => {
  await setJsonRequired(
    refreshSessionKey(refreshToken),
    session,
    env.authRefreshTokenTtlSeconds,
  );
};

export const getRefreshSession = async (
  refreshToken: string,
): Promise<RefreshSession | null> => {
  return getJsonRequired<RefreshSession>(refreshSessionKey(refreshToken));
};

export const rotateRefreshSession = async (input: {
  previousToken: string;
  nextToken: string;
  session: RefreshSession;
}): Promise<void> => {
  await rotateJsonKey({
    previousKey: refreshSessionKey(input.previousToken),
    nextKey: refreshSessionKey(input.nextToken),
    value: input.session,
    ttlSeconds: env.authRefreshTokenTtlSeconds,
  });
};

export const revokeRefreshSession = async (
  refreshToken: string,
): Promise<void> => {
  await deleteKeyRequired(refreshSessionKey(refreshToken));
};
