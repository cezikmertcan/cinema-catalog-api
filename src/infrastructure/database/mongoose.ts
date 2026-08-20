import mongoose from "mongoose";
import type { DependencyHealth } from "../../shared/health/dependency-health";
import { DirectorModel } from "../../modules/directors/director.model";
import { MovieModel } from "../../modules/movies/movie.model";
import { UserModel } from "../../modules/auth/user.model";

let connectionPromise: Promise<void> | undefined;

export const ensureDatabaseIndexes = async (): Promise<void> => {
  await Promise.all([
    DirectorModel.createIndexes(),
    MovieModel.createIndexes(),
    UserModel.createIndexes(),
  ]);
};

export const connectToDatabase = async (uri: string): Promise<void> => {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (connectionPromise !== undefined) {
    await connectionPromise;
    return;
  }

  connectionPromise = mongoose
    .connect(uri, {
      serverSelectionTimeoutMS: 5000,
    })
    .then(async () => {
      await ensureDatabaseIndexes();
    })
    .catch((error) => {
      connectionPromise = undefined;
      throw error;
    });

  await connectionPromise;
};

export const disconnectFromDatabase = async (): Promise<void> => {
  await mongoose.disconnect();
  connectionPromise = undefined;
};

export const checkDatabaseHealth = async (
  uri: string,
): Promise<DependencyHealth> => {
  const startedAt = Date.now();

  try {
    await connectToDatabase(uri);

    if (mongoose.connection.db === undefined) {
      throw new Error("MongoDB connection is not ready.");
    }

    await mongoose.connection.db.command({ ping: 1 });

    return {
      status: "up",
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    console.error("MongoDB health check failed.", error);

    return {
      status: "down",
      latencyMs: Date.now() - startedAt,
    };
  }
};
