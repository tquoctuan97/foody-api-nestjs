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
    type: Boolean,
    description: 'When true, list soft-deleted bills only',
  })
  isDeleted?: boolean;
  @ApiPropertyOptional({
    description: 'get bill list by customer id',
  })
  customerId?: string;
  @ApiPropertyOptional({
    type: Boolean,
    description:
      'When true, only bills without customerId (mutually exclusive with customerId)',
  })
  withoutCustomerId?: boolean;
}

export class BillSummaryParams extends BillParams {
  @ApiPropertyOptional({
    enum: ['date', 'customer'],
    default: 'date',
    description: 'Aggregate bills in the date range by day or by customer',
  })
  groupBy?: 'date' | 'customer';
}
