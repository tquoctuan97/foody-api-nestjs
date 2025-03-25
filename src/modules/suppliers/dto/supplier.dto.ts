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
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  displayName?: string;

  @IsString()
  @IsOptional()
  profileSrc?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;
}

export class UpdateSupplierDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsNotEmpty()
  displayName?: string;

  @IsString()
  @IsOptional()
  profileSrc?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsBoolean()
  @IsOptional()
  isDeleted?: boolean;
}

export class SupplierFilterDto extends PaginationParams {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsBoolean()
  @IsOptional()
  isDeleted?: boolean;
}
