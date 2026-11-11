import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationParams } from 'src/common/pagination/pagination.model';

export class UnlinkedBillItemsParams extends PaginationParams {
  @ApiPropertyOptional({
    type: Boolean,
    description: 'When true, list soft-deleted bills only',
  })
  isDeleted?: boolean;
}
