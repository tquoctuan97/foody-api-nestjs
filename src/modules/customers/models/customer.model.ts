import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationParams } from 'src/common/pagination/pagination.model';

export class CustomerParams extends PaginationParams {
  @ApiPropertyOptional({
    type: Boolean,
    description: 'When true, list soft-deleted customers only',
  })
  isDeleted?: boolean;
}
