import { ApiPropertyOptional } from '@nestjs/swagger';

export enum StoreStatus {
  PUBLISHED = 'published',
  PRIVATE = 'private',
  DRAFT = 'draft',
}

export class StoreParams {
  @ApiPropertyOptional()
  search?: string;

  @ApiPropertyOptional()
  status?: StoreStatus;
}
