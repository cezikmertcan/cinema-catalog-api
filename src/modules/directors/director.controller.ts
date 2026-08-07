import type { RequestHandler } from "express";
import { asyncHandler } from "../../shared/http/async-handler";
import { parseCreateDirector } from "./director.validation";
import {
  createDirector,
  deleteDirector,
} from "./director.service";
import type { DirectorDocument } from "./director.model";

const serializeDirector = (director: DirectorDocument) => ({
  id: director._id.toString(),
  firstName: director.firstName,
  secondName: director.secondName,
  birthDate: director.birthDate.toISOString().slice(0, 10),
  bio: director.bio,
});

const create: RequestHandler = async (request, response) => {
  const input = parseCreateDirector(request.body);
  const director = await createDirector(input);

  response.status(201).json({
    data: serializeDirector(director),
  });
};

const remove: RequestHandler = async (request, response) => {
  await deleteDirector(request.params.id);
  response.status(204).send();
};

export const createDirectorHandler = asyncHandler(create);
export const deleteDirectorHandler = asyncHandler(remove);
