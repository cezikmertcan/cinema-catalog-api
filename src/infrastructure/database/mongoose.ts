import mongoose from "mongoose";

let connectionPromise: Promise<void> | undefined;

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
    .then(() => undefined)
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
