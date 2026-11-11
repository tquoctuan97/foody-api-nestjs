import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
} from 'class-validator';
import { IsObjectId } from 'src/common/is-object-id/is-object-id.decorator';

/** Chỉ billDate + customer (customerName, customerId). */
export class BulkPatchBillsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @Matches(/^[a-fA-F0-9]{24}$/, {
    each: true,
    message: 'each id must be a MongoDB ObjectId',
  })
  ids: string[];

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  billDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  customerName?: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'ObjectId to link; null to clear customerId',
  })
  @IsOptional()
  @ValidateIf((_, value) => value != null && value !== '')
  @IsString()
  @IsObjectId()
  customerId?: string | null;
}

export class BulkPatchBillsResultDto {
  @ApiProperty({ example: 3 })
  updated: number;
}
