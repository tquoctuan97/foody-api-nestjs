import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class MetadataDto {
  @ApiProperty()
  readonly pageSize: number;

  @ApiProperty()
  readonly currentPage: number;

  @ApiProperty()
  readonly totalPages: number;

  @ApiProperty()
  readonly totalCount: number;

  @ApiProperty()
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
  @ApiProperty({ type: [Object] })
  @Type(() => Object)
  readonly data: T;

  @ApiProperty({ type: [Object] })
  @Type(() => Object)
  readonly metadata: MetadataDto;

  constructor(data: T, metadata: MetadataDto) {
    this.data = data;
    this.metadata = metadata;
  }
}
