import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { IsObjectId } from 'src/common/is-object-id/is-object-id.decorator';

export class CustomerPurchaseReportParams {
  @ApiProperty()
  @IsString()
  @IsObjectId()
  customerId: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @IsString()
  @IsNotEmpty()
  billDateFrom: string;

  @ApiProperty({ example: '2024-01-31T23:59:59.999Z' })
  @IsString()
  @IsNotEmpty()
  billDateTo: string;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'When true, include soft-deleted bills only',
  })
  isDeleted?: boolean;
}
