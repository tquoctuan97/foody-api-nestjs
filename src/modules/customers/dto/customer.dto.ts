import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsMongoId, IsOptional, IsString } from 'class-validator';
import { PaginationParams } from 'src/common/pagination/pagination.model';

export class CreateCustomerDto {
  @ApiProperty({
    required: true,
    type: String,
  })
  @IsString()
  name: string;

  @ApiProperty({
    required: true,
    type: String,
  })
  @IsString()
  displayName: string;

  @ApiProperty({
    required: false,
    default: null,
    type: String,
  })
  @IsOptional()
  @IsString()
  profileSrc?: string | null;

  @ApiProperty({
    required: false,
    default: null,
    type: String,
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string | null;
}

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}

export class CustomerFilterDto extends PaginationParams {
  @ApiPropertyOptional({
    description: 'Name',
    type: String,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    type: String,
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'Search query',
    type: String,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Include deleted items',
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  isDeleted?: boolean;

  @ApiPropertyOptional({
    description: 'Sort query',
    type: String,
  })
  @IsOptional()
  @IsString()
  sort?: string;
} 