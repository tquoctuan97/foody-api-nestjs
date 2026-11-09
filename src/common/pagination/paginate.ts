import { PaginationDto, MetadataDto } from './pagination.dto';

export function parsePagination(query?: { page?: string; pageSize?: string }) {
  const currentPage = parseInt(query?.page, 10) || 1;
  const pageSize = parseInt(query?.pageSize, 10) || 10;
  return { currentPage, pageSize };
}

export function softDeleteFilter(isDeleted?: boolean) {
  return isDeleted
    ? { deletedAt: { $ne: null as Date | null } }
    : { deletedAt: null as Date | null };
}

export function buildPaginatedResult<T>(
  data: T,
  totalCount: number,
  currentPage: number,
  pageSize: number,
): PaginationDto<T> {
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  return new PaginationDto(
    data,
    new MetadataDto(
      pageSize,
      currentPage,
      totalPages,
      totalCount,
      currentPage < totalPages,
    ),
  );
}
