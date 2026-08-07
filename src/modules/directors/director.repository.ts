import { DirectorModel, type DirectorDocument } from "./director.model";
import type { CreateDirectorInput } from "./director.types";

export const insertDirector = async (
  input: CreateDirectorInput,
): Promise<DirectorDocument> => {
  return DirectorModel.create(input);
};

export const deleteDirectorById = async (
  id: string,
): Promise<DirectorDocument | null> => {
  return DirectorModel.findByIdAndDelete(id).exec();
};

export const directorExists = async (id: string): Promise<boolean> => {
  return Boolean(await DirectorModel.exists({ _id: id }));
};
