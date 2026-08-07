import type { Server } from "node:http";
import { buildApp } from "./app";
import { env } from "./config/env";
import {
  connectToCache,
  disconnectFromCache,
} from "./infrastructure/cache/redis";
import {
  connectToDatabase,
  disconnectFromDatabase,
} from "./infrastructure/database/mongoose";

const app = buildApp();
let server: Server | undefined;

const listen = (): Promise<Server> =>
  new Promise((resolve, reject) => {
    const instance = app.listen(env.port, "0.0.0.0", () => {
      console.log(`Cinema Catalog API listening on port ${env.port}`);
      resolve(instance);
    });

    instance.once("error", reject);
  });

const closeServer = async (): Promise<void> => {
  if (!server) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    server?.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  server = undefined;
};

const shutdown = async (signal: string): Promise<void> => {
  console.log(`Received ${signal}. Shutting down.`);

  try {
    await closeServer();
    await disconnectFromCache();
    await disconnectFromDatabase();
    process.exit(0);
  } catch (error) {
    console.error("Failed to shut down cleanly.", error);
    process.exit(1);
  }
};

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

const start = async (): Promise<void> => {
  try {
    await connectToDatabase(env.mongoUri);
    await connectToCache(env.redisUrl);
    server = await listen();
  } catch (error) {
    console.error("Failed to start the application.", error);
    await disconnectFromCache();
    await disconnectFromDatabase();
    process.exitCode = 1;
  }
};

void start();
