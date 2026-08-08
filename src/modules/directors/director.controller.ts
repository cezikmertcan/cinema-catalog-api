import type { RequestHandler } from "express";
import { asyncHandler } from "../../shared/http/async-handler";
import {
  parseCreateDirector,
  parseDirectorListQuery,
  parseIncludeMovies,
  parseUpdateDirector,
} from "./director.validation";
import {
  createDirector,
  deleteDirector,
  getDirector,
  listDirectors,
  updateDirector,
} from "./director.service";
import { serializeDirector } from "./director.serializer";

const create: RequestHandler = async (request, response) => {
  const input = parseCreateDirector(request.body);
  const director = await createDirector(input);

  response.status(201).json({
    data: serializeDirector(director),
  });
};

const list: RequestHandler = async (request, response) => {
  const { includeMovies, pagination } = parseDirectorListQuery(request.query);
  const directors = await listDirectors({ includeMovies, pagination });

  response.status(200).json(directors);
};

const get: RequestHandler = async (request, response) => {
  const includeMovies = parseIncludeMovies(request.query.include);
  const director = await getDirector(request.params.id, { includeMovies });

  response.status(200).json({
    data: director,
  });
};

const update: RequestHandler = async (request, response) => {
  const input = parseUpdateDirector(request.body);
  const director = await updateDirector(request.params.id, input);

  response.status(200).json({
    data: director,
  });
};

const remove: RequestHandler = async (request, response) => {
  await deleteDirector(request.params.id);
  response.status(204).send();
};

export const createDirectorHandler = asyncHandler(create);
export const listDirectorsHandler = asyncHandler(list);
export const getDirectorHandler = asyncHandler(get);
export const updateDirectorHandler = asyncHandler(update);
export const deleteDirectorHandler = asyncHandler(remove);
