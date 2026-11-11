import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PaginationParams } from 'src/common/pagination/pagination.model';

export class UnlinkedBillsParams extends PaginationParams {
  @ApiPropertyOptional({
    enum: ['customerName'],
    description: 'Aggregate by customer name instead of returning bill rows',
  })
  @IsOptional()
  @IsIn(['customerName'])
  groupBy?: 'customerName';

  @ApiPropertyOptional({
    description:
      'Exact customer name — paginated bill rows for that name (use after groupBy drill-down)',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  customerName?: string;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'When true, list soft-deleted bills only',
  })
  isDeleted?: boolean;
}
