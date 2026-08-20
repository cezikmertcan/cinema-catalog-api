const nodeEnv = process.env.NODE_ENV ?? "development";
const requiresExplicitAuthSecret =
  nodeEnv === "production" || process.env.VERCEL === "1";
const port = Number(process.env.PORT ?? 3000);
const authJwtSecret =
  process.env.AUTH_JWT_SECRET ??
  (requiresExplicitAuthSecret
    ? undefined
    : "local-development-secret-change-before-production");

const parsePositiveInteger = (
  name: string,
  value: string | undefined,
  fallback: number,
): number => {
  const parsed = Number(value ?? fallback);

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
};

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}

if (authJwtSecret === undefined) {
  throw new Error("AUTH_JWT_SECRET must be set in production or hosted runtimes.");
}

if (requiresExplicitAuthSecret && authJwtSecret.length < 32) {
  throw new Error(
    "AUTH_JWT_SECRET must be at least 32 characters in production or hosted runtimes.",
  );
}

export const env = {
  nodeEnv,
  port,
  mongoUri:
    process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/cinema_catalog",
  redisUrl: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
  authJwtSecret,
  authJwtIssuer: process.env.AUTH_JWT_ISSUER ?? "cinema-catalog-api",
  authJwtAudience:
    process.env.AUTH_JWT_AUDIENCE ?? "cinema-catalog-api-client",
  authAccessTokenTtlSeconds: parsePositiveInteger(
    "AUTH_ACCESS_TOKEN_TTL_SECONDS",
    process.env.AUTH_ACCESS_TOKEN_TTL_SECONDS,
    900,
  ),
  authRefreshTokenTtlSeconds: parsePositiveInteger(
    "AUTH_REFRESH_TOKEN_TTL_SECONDS",
    process.env.AUTH_REFRESH_TOKEN_TTL_SECONDS,
    60 * 60 * 24 * 30,
  ),
  authRedisPrefix: process.env.AUTH_REDIS_PREFIX ?? "cinema-catalog:auth",
};
