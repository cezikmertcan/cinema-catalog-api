import { Types } from "mongoose";
import { MovieModel, type MovieDocument } from "./movie.model";
import type { CreateMovieInput, UpdateMovieInput } from "./movie.types";

export type PersistedMovieInput = Omit<CreateMovieInput, "directorId"> & {
  directorId: Types.ObjectId;
};

export type PersistedMovieUpdateInput = Omit<UpdateMovieInput, "directorId"> & {
  directorId?: Types.ObjectId;
};

export const insertMovie = async (
  input: PersistedMovieInput,
): Promise<MovieDocument> => {
  return MovieModel.create(input);
};

export const findAllMovies = async (): Promise<MovieDocument[]> => {
  return MovieModel.find().sort({ releaseDate: -1, title: 1 }).exec();
};

export const findMovieById = async (
  id: string,
): Promise<MovieDocument | null> => {
  return MovieModel.findById(id).exec();
};

export const updateMovieById = async (
  id: string,
  input: PersistedMovieUpdateInput,
): Promise<MovieDocument | null> => {
  return MovieModel.findByIdAndUpdate(id, input, {
    returnDocument: "after",
    runValidators: true,
  }).exec();
};

export const deleteMovieById = async (
  id: string,
): Promise<MovieDocument | null> => {
  return MovieModel.findByIdAndDelete(id).exec();
};
