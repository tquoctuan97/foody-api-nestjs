import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationParams } from 'src/common/pagination/pagination.model';

export class BillParams extends PaginationParams {
  @ApiPropertyOptional({
    description: '2024-01-01T00:00:00.000Z',
  })
  billDate?: string;
  @ApiPropertyOptional({
    description: 'get deleted bill list',
  })
  isDeleted?: boolean;
}
