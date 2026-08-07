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
}

export const serializeMovie = (movie: MovieDocument): MovieResponse => ({
  id: movie._id.toString(),
  title: movie.title,
  description: movie.description,
  releaseDate: movie.releaseDate.toISOString().slice(0, 10),
  genre: movie.genre,
  rating: movie.rating,
  imdbId: movie.imdbId,
  directorId: movie.directorId.toString(),
});
