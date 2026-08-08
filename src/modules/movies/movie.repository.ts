import { Types } from "mongoose";
import { MovieModel, type MovieDocument } from "./movie.model";
import type {
  CreateMovieInput,
  MovieQueryOptions,
  UpdateMovieInput,
} from "./movie.types";

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

export const findAllMovies = async (
  options: MovieQueryOptions = {},
): Promise<MovieDocument[]> => {
  const query = MovieModel.find().sort({ releaseDate: -1, title: 1 });

  if (options.includeDirector === true) {
    query.populate({
      path: "directorId",
      select: "firstName secondName birthDate bio",
    });
  }

  return query.exec();
};

export const findMovieById = async (
  id: string,
  options: MovieQueryOptions = {},
): Promise<MovieDocument | null> => {
  const query = MovieModel.findById(id);

  if (options.includeDirector === true) {
    query.populate({
      path: "directorId",
      select: "firstName secondName birthDate bio",
    });
  }

  return query.exec();
};

export const moviesExistForDirector = async (id: string): Promise<boolean> => {
  return Boolean(await MovieModel.exists({ directorId: new Types.ObjectId(id) }));
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
