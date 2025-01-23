import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsObject,
  IsMongoId,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Types } from 'mongoose';
import { PaginationParams } from 'src/common/pagination/pagination.model';

export class CreateAuditLogDto {
  @IsMongoId()
  @IsNotEmpty()
  retailerId: Types.ObjectId;

  @IsMongoId()
  @IsNotEmpty()
  modifiedBy: Types.ObjectId;

  @IsString()
  @IsNotEmpty()
  module: string;

  @IsString()
  @IsNotEmpty()
  action: string;

  @IsObject()
  @IsOptional()
  oldData?: object;

  @IsObject()
  @IsOptional()
  newData?: object;
}

export class AuditLogFilterDto extends PaginationParams {
  @IsMongoId()
  @IsOptional()
  retailerId?: Types.ObjectId;

  @IsMongoId()
  @IsOptional()
  modifiedBy?: Types.ObjectId;

  @IsString()
  @IsOptional()
  action?: string;

  @IsString()
  @IsOptional()
  module?: string;
}
