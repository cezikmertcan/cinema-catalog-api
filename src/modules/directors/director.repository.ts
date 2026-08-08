import { DirectorModel, type DirectorDocument } from "./director.model";
import type {
  CreateDirectorInput,
  UpdateDirectorInput,
} from "./director.types";

export const insertDirector = async (
  input: CreateDirectorInput,
): Promise<DirectorDocument> => {
  return DirectorModel.create(input);
};

export const findAllDirectors = async (): Promise<DirectorDocument[]> => {
  return DirectorModel.find().sort({ firstName: 1, secondName: 1 }).exec();
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
