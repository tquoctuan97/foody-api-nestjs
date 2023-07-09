import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationParams } from 'src/common/pagination/pagination.model';

export enum StoreStatus {
  PUBLISHED = 'published',
  PRIVATE = 'private',
  DRAFT = 'draft',
}

export class StoreParams extends PaginationParams {
  @ApiPropertyOptional()
  status?: StoreStatus;

  @ApiPropertyOptional()
  cuisine?: string;
}
