export interface CreateMovieInput {
  title: string;
  description: string;
  releaseDate: Date;
  genre: string;
  rating: number;
  imdbId: string;
  directorId: string;
}

export type UpdateMovieInput = Partial<CreateMovieInput>;

export interface MovieQueryOptions {
  includeDirector?: boolean;
}
