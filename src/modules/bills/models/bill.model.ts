import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationParams } from 'src/common/pagination/pagination.model';

export class BillParams extends PaginationParams {
  @ApiPropertyOptional({
    example: '2024-01-01T00:00:00.000Z',
  })
  billDate?: string;
  @ApiPropertyOptional({
    example: '2024-01-01T00:00:00.000Z',
    description: 'billDateFrom must be the same or before billDateTo',
  })
  billDateFrom?: string;
  @ApiPropertyOptional({
    example: '2024-01-31T00:00:00.000Z',
  })
  billDateTo?: string;
  @ApiPropertyOptional({
    description: 'get deleted bill list',
  })
  isDeleted?: boolean;
}
