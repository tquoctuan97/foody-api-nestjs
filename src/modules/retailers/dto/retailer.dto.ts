import {
  IsString,
  IsBoolean,
  IsOptional,
  IsNotEmpty,
  IsMongoId,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Types } from 'mongoose';

export class CreateRetailerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsMongoId()
  @IsOptional()
  ownerId: Types.ObjectId;
}

export class UpdateRetailerDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
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
