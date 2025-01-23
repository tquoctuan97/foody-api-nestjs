import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Types } from 'mongoose';

export class CreateRetailerDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(128)
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  address: string;

  @IsMongoId()
  @IsNotEmpty()
  ownerId: Types.ObjectId;
}

export class UpdateRetailerDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  ownerId?: Types.ObjectId;

  @IsArray()
  @IsOptional()
  modIds?: Types.ObjectId[];

  @IsBoolean()
  @IsOptional()
  isDeleted?: boolean;
}

export class RetailerFilterDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsMongoId()
  @IsOptional()
  ownerId?: Types.ObjectId;

  @IsBoolean()
  @IsOptional()
  isDeleted?: boolean;
}

export class PaginationDto {
  @Type(() => Number)
  @IsOptional()
  page?: number;

  @Type(() => Number)
  @IsOptional()
  limit?: number;
}
