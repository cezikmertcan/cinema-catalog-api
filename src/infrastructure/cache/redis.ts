import { createClient, type RedisClientType } from "redis";
import type { DependencyHealth } from "../../shared/health/dependency-health";

type RedisClient = RedisClientType<{}, {}, {}, 3, {}>;

let client: RedisClient | undefined;
let connectionPromise: Promise<void> | undefined;

export const isCacheReady = (): boolean => {
  return client?.isReady === true;
};

export const connectToCache = async (url: string): Promise<void> => {
  if (client?.isReady) {
    return;
  }

  if (connectionPromise !== undefined) {
    await connectionPromise;
    return;
  }

  const nextClient = createClient<{}, {}, {}, 3, {}>({
    url,
    socket: {
      connectTimeout: 5000,
      reconnectStrategy: false,
    },
  });

  nextClient.on("error", (error) => {
    console.error("Redis client error.", error);
  });

  connectionPromise = nextClient
    .connect()
    .then(() => {
      client = nextClient;
    })
    .catch((error) => {
      console.error("Redis is unavailable. Continuing without cache.", error);
      nextClient.destroy();
    })
    .finally(() => {
      connectionPromise = undefined;
    });

  await connectionPromise;
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

  connectionPromise = undefined;
};

export const checkCacheHealth = async (
  url: string,
): Promise<DependencyHealth> => {
  const startedAt = Date.now();

  try {
    await connectToCache(url);

    if (client?.isReady !== true) {
      throw new Error("Redis connection is not ready.");
    }

    await client.ping();

    return {
      status: "up",
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    console.error("Redis health check failed.", error);

    return {
      status: "down",
      latencyMs: Date.now() - startedAt,
    };
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

const withRequiredCache = async <T>(
  operation: (redisClient: RedisClient) => Promise<T>,
): Promise<T> => {
  const activeClient = client;

  if (activeClient?.isReady !== true) {
    throw new Error("Redis connection is not ready.");
  }

  return operation(activeClient);
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

export const getJsonRequired = async <T>(key: string): Promise<T | null> => {
  return withRequiredCache(async (redisClient) => {
    const value = await redisClient.get(key);

    if (value === null) {
      return null;
    }

    return JSON.parse(value) as T;
  });
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

export const setJsonRequired = async <T>(
  key: string,
  value: T,
  ttlSeconds: number,
): Promise<void> => {
  await withRequiredCache(async (redisClient) => {
    await redisClient.set(key, JSON.stringify(value), { EX: ttlSeconds });
  });
};

export const getOrInitializeInteger = async (
  key: string,
  initialValue: number,
): Promise<number> => {
  return withCache(async (redisClient) => {
    await redisClient.set(key, String(initialValue), { NX: true });
    const value = await redisClient.get(key);
    const parsedValue = value === null ? initialValue : Number(value);

    return Number.isSafeInteger(parsedValue) ? parsedValue : initialValue;
  }, initialValue);
};

export const incrementInteger = async (
  key: string,
  initialValue: number,
): Promise<number> => {
  return withCache(async (redisClient) => {
    await redisClient.set(key, String(initialValue), { NX: true });
    return redisClient.incr(key);
  }, initialValue);
};

export const deleteKey = async (key: string): Promise<void> => {
  await withCache(async (redisClient) => {
    await redisClient.del(key);
  }, undefined);
};

export const deleteKeyRequired = async (key: string): Promise<void> => {
  await withRequiredCache(async (redisClient) => {
    await redisClient.del(key);
  });
};

export const rotateJsonKey = async <T>(input: {
  previousKey: string;
  nextKey: string;
  value: T;
  ttlSeconds: number;
}): Promise<void> => {
  await withRequiredCache(async (redisClient) => {
    await redisClient
      .multi()
      .set(input.nextKey, JSON.stringify(input.value), {
        EX: input.ttlSeconds,
      })
      .del(input.previousKey)
      .exec();
  });
};

export const deleteKeysByPattern = async (pattern: string): Promise<void> => {
  await withCache(async (redisClient) => {
    const keys: string[] = [];

    for await (const batch of redisClient.scanIterator({
      MATCH: pattern,
      COUNT: 100,
    })) {
      const scannedKeys = Array.isArray(batch) ? batch : [batch];
      keys.push(...scannedKeys.map((key) => String(key)));
    }

    if (keys.length > 0) {
      await Promise.all(keys.map((key) => redisClient.del(key)));
    }
  }, undefined);
};
