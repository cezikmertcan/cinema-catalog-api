import { createClient, type RedisClientType } from "redis";

type RedisClient = RedisClientType<{}, {}, {}, 3, {}>;

let client: RedisClient | undefined;

export const isCacheReady = (): boolean => {
  return client?.isReady === true;
};

export const connectToCache = async (url: string): Promise<void> => {
  if (client?.isReady) {
    return;
  }

  const nextClient = createClient<{}, {}, {}, 3, {}>({
    url,
    socket: {
      reconnectStrategy: false,
    },
  });

  nextClient.on("error", (error) => {
    console.error("Redis client error.", error);
  });

  try {
    await nextClient.connect();
    client = nextClient;
  } catch (error) {
    console.error("Redis is unavailable. Continuing without cache.", error);
    nextClient.destroy();
  }
};

export const disconnectFromCache = async (): Promise<void> => {
  if (client === undefined) {
    return;
  }

  const activeClient = client;
  client = undefined;

  if (activeClient.isOpen) {
    await activeClient.close();
  }
};

const withCache = async <T>(
  operation: (redisClient: RedisClient) => Promise<T>,
  fallback: T,
): Promise<T> => {
  if (client?.isReady !== true) {
    return fallback;
  }

  try {
    return await operation(client);
  } catch (error) {
    console.error("Redis cache operation failed.", error);
    return fallback;
  }
};

export const getJson = async <T>(key: string): Promise<T | null> => {
  return withCache(async (redisClient) => {
    const value = await redisClient.get(key);

    if (value === null) {
      return null;
    }

    return JSON.parse(value) as T;
  }, null);
};

export const setJson = async <T>(
  key: string,
  value: T,
  ttlSeconds: number,
): Promise<void> => {
  await withCache(async (redisClient) => {
    await redisClient.set(key, JSON.stringify(value), { EX: ttlSeconds });
  }, undefined);
};

export const deleteKey = async (key: string): Promise<void> => {
  await withCache(async (redisClient) => {
    await redisClient.del(key);
  }, undefined);
};
