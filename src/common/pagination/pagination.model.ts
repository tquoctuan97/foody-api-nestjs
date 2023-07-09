import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationParams {
  @ApiPropertyOptional()
  page?: string;

  @ApiPropertyOptional({
    description: 'Number of items per page',
  })
  pageSize?: string;

  @ApiPropertyOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Sort by field. `-` for descending, `+` for ascending',
  })
  sort?: string;
}
