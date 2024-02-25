import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUrl, Min, MinLength } from 'class-validator';

export class BillItem {
  @ApiProperty({
    required: true,
  })
  name: string;

  @ApiProperty({
    required: true,
  })
  price: number;

  @ApiProperty({
    required: true,
  })
  quantity: number;

  @ApiProperty({
    required: true,
  })
  total: number;
}

export class CreateBillDto {
  @ApiProperty({
    required: true,
    type: Date,
  })
  billDate: Date;

  @ApiProperty({
    required: true,
    type: String,
  })
  customerName: string;

  @ApiProperty({
    required: true,
    type: [BillItem],
  })
  billList: BillItem[];

  @ApiProperty({
    required: true,
    type: Number,
  })
  sum: number;

  @ApiProperty({
    required: false,
    default: null,
    type: Number,
  })
  debt: number | null;

  @ApiProperty({
    required: false,
    default: null,
    type: Number,
  })
  prePay: number | null;

  @ApiProperty({
    required: true,
    type: Number,
  })
  finalResult: number;
}
