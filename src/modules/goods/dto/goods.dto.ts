import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString
} from 'class-validator';
import { PaginationParams } from 'src/common/pagination/pagination.model';

export class CreateGoodDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  unit?: string;
}

export class UpdateGoodDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsBoolean()
  @IsOptional()
  isDeleted?: boolean;
}

export class GoodFilterDto extends PaginationParams {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsBoolean()
  @IsOptional()
  isDeleted?: boolean;
}
