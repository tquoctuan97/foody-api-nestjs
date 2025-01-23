import {
  IsArray,
  IsBoolean,
  IsDate,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationParams } from 'src/common/pagination/pagination.model';

export class CreateSupplyOrderDto {
  @IsMongoId()
  @IsNotEmpty()
  retailerId: Types.ObjectId;

  @IsMongoId()
  @IsNotEmpty()
  supplierId: Types.ObjectId;

  @ApiProperty({ required: true, type: Date })
  @IsDate()
  @Type(() => Date)
  orderDate?: Date;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSupplyOrderItemDto)
  items: CreateSupplyOrderItemDto[];

  @IsNumber()
  @IsOptional()
  totalAmount?: number;

  @IsNumber()
  @IsOptional()
  paid?: number;

  @IsNumber()
  @IsOptional()
  debt?: number;

  @IsBoolean()
  @IsOptional()
  isPaidComplete?: boolean;
}
export class CreateSupplyOrderItemDto {
  @IsMongoId()
  @IsNotEmpty()
  goodId: Types.ObjectId;

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
  price: number;

  @ApiProperty({
    required: true,
  })
  @IsNumber()
  total: number;
}

export class UpdateSupplyOrderDto {
  @IsMongoId()
  @IsOptional()
  retailerId?: Types.ObjectId;

  @IsMongoId()
  @IsOptional()
  supplierId?: Types.ObjectId;

  @IsDate()
  @IsOptional()
  orderDate?: Date;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSupplyOrderItemDto)
  @IsOptional()
  items?: CreateSupplyOrderItemDto[];

  @IsNumber()
  @IsOptional()
  totalAmount?: number;

  @IsNumber()
  @IsOptional()
  paid?: number;

  @IsNumber()
  @IsOptional()
  debt?: number;

  @IsBoolean()
  @IsOptional()
  isPaidComplete?: boolean;
}

export class SupplyOrderFilterDto extends PaginationParams {
  @IsMongoId()
  @IsNotEmpty()
  retailerId?: Types.ObjectId;

  @IsMongoId()
  @IsOptional()
  supplierId?: Types.ObjectId;

  @IsDate()
  @IsOptional()
  orderDate?: Date;

  @IsBoolean()
  @IsOptional()
  isPaidComplete?: boolean;

  @IsBoolean()
  @IsOptional()
  isDeleted?: boolean;
}
