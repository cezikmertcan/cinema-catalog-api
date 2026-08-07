import mongoose from "mongoose";

export const connectToDatabase = async (uri: string): Promise<void> => {
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
  });
};

export const disconnectFromDatabase = async (): Promise<void> => {
  await mongoose.disconnect();
};
