import {
  IsBoolean,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { Types } from 'mongoose';
import { PaginationParams } from 'src/common/pagination/pagination.model';

export class CreateSupplierDto {
  @IsMongoId()
  @IsNotEmpty()
  retailerId: Types.ObjectId;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  contact?: string;
}

export class UpdateSupplierDto {
  @IsMongoId()
  @IsOptional()
  retailerId?: Types.ObjectId;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  contact?: string;

  @IsBoolean()
  @IsOptional()
  isDeleted?: boolean;
}

export class SupplierFilterDto extends PaginationParams {
  @IsMongoId()
  @IsNotEmpty()
  retailerId?: Types.ObjectId;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  contact?: string;

  @IsBoolean()
  @IsOptional()
  isDeleted?: boolean;
}
