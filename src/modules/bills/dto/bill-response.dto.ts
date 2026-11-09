import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MetadataDto } from 'src/common/pagination/pagination.dto';
import { Bill } from '../entities/bill.entity';

export class PaginatedBillResponse {
  @ApiProperty({ type: [Bill] })
  data: Bill[];

  @ApiProperty({ type: MetadataDto })
  metadata: MetadataDto;
}

export class BillSummaryByDateItemDto {
  @ApiProperty({ type: String, format: 'date-time' })
  name: Date;

  @ApiProperty()
  totalSpent: number;
}

export class BillSummaryByCustomerItemDto {
  @ApiProperty()
  customerName: string;

  @ApiProperty()
  customerId: string;

  @ApiProperty()
  totalSpent: number;

  @ApiProperty()
  billCount: number;
}
