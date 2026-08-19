import { HydratedDocument, model, Schema, Types } from "mongoose";

export interface MovieEntity {
  title: string;
  description: string;
  releaseDate: Date;
  genre: string;
  rating: number;
  imdbId: string;
  directorId: Types.ObjectId;
}

const movieSchema = new Schema<MovieEntity>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    releaseDate: {
      type: Date,
      required: true,
    },
    genre: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    rating: {
      type: Number,
      required: true,
      min: 0,
      max: 10,
    },
    imdbId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: /^tt\d+$/,
      maxlength: 20,
    },
    directorId: {
      type: Schema.Types.ObjectId,
      ref: "Director",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

movieSchema.index(
  { releaseDate: -1, title: 1 },
  { name: "movies_release_date_title_sort" },
);
movieSchema.index(
  { directorId: 1, releaseDate: -1, title: 1 },
  { name: "movies_director_release_date_title" },
);

export const MovieModel = model<MovieEntity>("Movie", movieSchema);
export type MovieDocument = HydratedDocument<MovieEntity>;
