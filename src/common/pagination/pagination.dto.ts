import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class MetadataDto {
  @ApiProperty({ example: 10 })
  readonly pageSize: number;

  @ApiProperty({ example: 1 })
  readonly currentPage: number;

  @ApiProperty({ example: 5 })
  readonly totalPages: number;

  @ApiProperty({ example: 42 })
  readonly totalCount: number;

  @ApiProperty({ example: true })
  readonly hasNextPage: boolean;

  constructor(
    pageSize: number,
    currentPage: number,
    totalPages: number,
    totalCount: number,
    hasNextPage: boolean,
  ) {
    this.pageSize = pageSize;
    this.currentPage = currentPage;
    this.totalPages = totalPages;
    this.totalCount = totalCount;
    this.hasNextPage = hasNextPage;
  }
}

export class PaginationDto<T> {
  @ApiProperty({ isArray: true })
  @Type(() => Object)
  readonly data: T;

  @ApiProperty({ type: MetadataDto })
  readonly metadata: MetadataDto;

  constructor(data: T, metadata: MetadataDto) {
    this.data = data;
    this.metadata = metadata;
  }
}
