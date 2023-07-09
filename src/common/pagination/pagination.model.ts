import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationParams {
  @ApiPropertyOptional({
    description: 'Page number',
    default: 1,
  })
  page?: string;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 10,
  })
  pageSize?: string;

  @ApiPropertyOptional({
    description: 'Search name',
  })
  search?: string;

  @ApiPropertyOptional({
    description: 'Sort by field. `-` for descending, `+` for ascending',
    default: '-createdAt',
  })
  sort?: string;
}
