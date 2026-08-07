import { HydratedDocument, model, Schema } from "mongoose";

export interface DirectorEntity {
  firstName: string;
  secondName: string;
  birthDate: Date;
  bio: string;
}

const directorSchema = new Schema<DirectorEntity>(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    secondName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    birthDate: {
      type: Date,
      required: true,
    },
    bio: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
  },
  {
    timestamps: true,
  },
);

export const DirectorModel = model<DirectorEntity>("Director", directorSchema);
export type DirectorDocument = HydratedDocument<DirectorEntity>;
