export interface CreateDirectorInput {
  firstName: string;
  secondName: string;
  birthDate: Date;
  bio: string;
}

export type UpdateDirectorInput = Partial<CreateDirectorInput>;

export interface DirectorQueryOptions {
  includeMovies?: boolean;
  pagination?: PaginationOptions;
  moviesPagination?: PaginationOptions;
}
import type { PaginationOptions } from "../../shared/pagination/pagination";
