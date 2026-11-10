import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationParams } from 'src/common/pagination/pagination.model';

export class ProductParams extends PaginationParams {
  @ApiPropertyOptional({
    type: Boolean,
    description: 'When true, list soft-deleted products only',
  })
  isDeleted?: boolean;
}
