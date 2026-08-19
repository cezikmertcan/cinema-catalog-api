export const defaultPage = 1;
export const defaultLimit = 20;
export const maxLimit = 100;

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginationMeta extends PaginationOptions {
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PaginatedQueryResult<T> {
  items: T[];
  total: number;
}

export const defaultPagination: PaginationOptions = {
  page: defaultPage,
  limit: defaultLimit,
};

export const resolvePagination = (input: {
  page?: number;
  limit?: number;
}): PaginationOptions => ({
  page: input.page ?? defaultPage,
  limit: input.limit ?? defaultLimit,
});

export const paginationOffset = ({ page, limit }: PaginationOptions): number => {
  return (page - 1) * limit;
};

export const createPaginationMeta = (
  pagination: PaginationOptions,
  total: number,
): PaginationMeta => {
  const totalPages = Math.ceil(total / pagination.limit);

  return {
    ...pagination,
    total,
    totalPages,
    hasNext: pagination.page < totalPages,
    hasPrevious: pagination.page > 1 && totalPages > 0,
  };
};
