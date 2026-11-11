import { ApiProperty } from '@nestjs/swagger';

export class UnlinkedBillsByCustomerItemDto {
  @ApiProperty()
  customerName: string;

  @ApiProperty()
  billCount: number;

  @ApiProperty()
  totalFinalResult: number;
}
