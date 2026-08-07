import { AppError } from "../../shared/errors/app-error";
import { readObjectId } from "../../shared/validation/request-validation";
import {
  deleteDirectorById,
  insertDirector,
} from "./director.repository";
import type { CreateDirectorInput } from "./director.types";

export const createDirector = async (input: CreateDirectorInput) => {
  return insertDirector(input);
};

export const deleteDirector = async (id: unknown): Promise<void> => {
  const directorId = readObjectId(id, "directorId");
  const deletedDirector = await deleteDirectorById(directorId);

  if (deletedDirector === null) {
    throw new AppError(
      404,
      "DIRECTOR_NOT_FOUND",
      `Director ${directorId} was not found.`,
    );
  }
};
