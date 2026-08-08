import type { DirectorDocument } from "../directors/director.model";
import {
  serializeDirector,
  type DirectorResponse,
} from "../directors/director.serializer";
import type { MovieDocument } from "./movie.model";

export interface MovieResponse {
  id: string;
  title: string;
  description: string;
  releaseDate: string;
  genre: string;
  rating: number;
  imdbId: string;
  directorId: string;
  director?: DirectorResponse;
}

export const serializeMovie = (movie: MovieDocument): MovieResponse => {
  const populatedDirectorId = movie.populated("directorId");
  const directorReference = populatedDirectorId ?? movie.directorId;
  const response: MovieResponse = {
    id: movie._id.toString(),
    title: movie.title,
    description: movie.description,
    releaseDate: movie.releaseDate.toISOString().slice(0, 10),
    genre: movie.genre,
    rating: movie.rating,
    imdbId: movie.imdbId,
    directorId: directorReference.toString(),
  };

  const director = movie.directorId as unknown as DirectorDocument | null;

  if (
    populatedDirectorId === undefined ||
    director === null ||
    typeof director !== "object" ||
    !("_id" in director)
  ) {
    return response;
  }

  return {
    ...response,
    director: serializeDirector(director),
  };
};
