import type { PaginationMeta } from "../../shared/pagination/pagination";
import type { DirectorDocument } from "./director.model";
import type { MovieResponse } from "../movies/movie.serializer";

export interface DirectorResponse {
  id: string;
  firstName: string;
  secondName: string;
  birthDate: string;
  bio: string;
}

export interface DirectorWithMoviesResponse extends DirectorResponse {
  movies: MovieResponse[];
  moviesMeta: PaginationMeta;
}

export type DirectorQueryResponse =
  | DirectorResponse
  | DirectorWithMoviesResponse;

export const serializeDirector = (
  director: DirectorDocument,
): DirectorResponse => ({
  id: director._id.toString(),
  firstName: director.firstName,
  secondName: director.secondName,
  birthDate: director.birthDate.toISOString().slice(0, 10),
  bio: director.bio,
});
