import { AppError } from "../../shared/errors/app-error";
import { readObjectId } from "../../shared/validation/request-validation";
import {
  deleteDirectorById,
  directorExists,
  insertDirector,
} from "./director.repository";
import { moviesExistForDirector } from "../movies/movie.repository";
import type { CreateDirectorInput } from "./director.types";

export const createDirector = async (input: CreateDirectorInput) => {
  return insertDirector(input);
};

export const deleteDirector = async (id: unknown): Promise<void> => {
  const directorId = readObjectId(id, "directorId");

  if (!(await directorExists(directorId))) {
    throw new AppError(
      404,
      "DIRECTOR_NOT_FOUND",
      `Director ${directorId} was not found.`,
    );
  }

  if (await moviesExistForDirector(directorId)) {
    throw new AppError(
      409,
      "DIRECTOR_HAS_MOVIES",
      `Director ${directorId} cannot be deleted while movies reference it.`,
    );
  }

  const deletedDirector = await deleteDirectorById(directorId);

  if (deletedDirector === null) {
    throw new AppError(
      404,
      "DIRECTOR_NOT_FOUND",
      `Director ${directorId} was not found.`,
    );
  }
};
