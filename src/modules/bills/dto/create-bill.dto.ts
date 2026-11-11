import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { IsObjectId } from 'src/common/is-object-id/is-object-id.decorator';

export class BillItem {
  @ApiProperty({
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    required: true,
  })
  @IsNumber()
  price: number;

  @ApiProperty({
    required: true,
  })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({
    required: true,
  })
  @IsNumber()
  total: number;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Link to catalog product',
  })
  @IsOptional()
  @ValidateIf((_, value) => value != null && value !== '')
  @IsString()
  @IsObjectId()
  productId?: string | null;
}

export class AdjustmentItem {
  @ApiProperty({
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ required: true, enum: ['add', 'subtract'] })
  @IsEnum(['add', 'subtract'], { message: 'Type must be "add" or "subtract"' })
  type: 'add' | 'subtract';

  @ApiProperty({ required: true })
  @IsNumber()
  amount: number;
}

export class CreateBillDto {
  @ApiProperty({ required: true, type: Date })
  @IsDate()
  @Type(() => Date)
  billDate: Date;

  @ApiProperty({
    required: true,
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  customerName: string;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsOptional()
  @IsString()
  @IsObjectId()
  customerId?: string;

  @ApiProperty({ required: true, type: [BillItem] })
  @ValidateNested({ each: true })
  @Type(() => BillItem)
  billList: BillItem[];

  @ApiProperty({
    required: true,
    type: Number,
  })
  sum: number;

  @ApiProperty({ required: false, type: [AdjustmentItem] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AdjustmentItem)
  adjustmentList: AdjustmentItem[];

  @ApiProperty({ required: true, type: Number })
  @IsNumber()
  finalResult: number;
}
