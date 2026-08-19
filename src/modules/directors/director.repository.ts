import { DirectorModel, type DirectorDocument } from "./director.model";
import {
  paginationOffset,
  type PaginatedQueryResult,
  type PaginationOptions,
} from "../../shared/pagination/pagination";
import type {
  CreateDirectorInput,
  UpdateDirectorInput,
} from "./director.types";

export const insertDirector = async (
  input: CreateDirectorInput,
): Promise<DirectorDocument> => {
  return DirectorModel.create(input);
};

export const findAllDirectors = async (
  pagination?: PaginationOptions,
): Promise<PaginatedQueryResult<DirectorDocument>> => {
  const query = DirectorModel.find().sort({
    firstName: 1,
    secondName: 1,
    _id: 1,
  });

  if (pagination !== undefined) {
    query.skip(paginationOffset(pagination)).limit(pagination.limit);
  }

  const [directors, total] = await Promise.all([
    query.exec(),
    DirectorModel.countDocuments().exec(),
  ]);

  return {
    items: directors,
    total,
  };
};

export const findDirectorById = async (
  id: string,
): Promise<DirectorDocument | null> => {
  return DirectorModel.findById(id).exec();
};

export const updateDirectorById = async (
  id: string,
  input: UpdateDirectorInput,
): Promise<DirectorDocument | null> => {
  return DirectorModel.findByIdAndUpdate(id, input, {
    returnDocument: "after",
    runValidators: true,
  }).exec();
};

export const deleteDirectorById = async (
  id: string,
): Promise<DirectorDocument | null> => {
  return DirectorModel.findByIdAndDelete(id).exec();
};

export const directorExists = async (id: string): Promise<boolean> => {
  return Boolean(await DirectorModel.exists({ _id: id }));
};
