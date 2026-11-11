import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationParams } from 'src/common/pagination/pagination.model';

export class ProductParams extends PaginationParams {
  @ApiPropertyOptional({
    type: Boolean,
    description: 'When true, list soft-deleted products only',
  })
  isDeleted?: boolean;
}

/** Query for GET /products/all (no page / pageSize). */
export class ProductListAllParams {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: '-createdAt' })
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'When true, list soft-deleted products only',
  })
  isDeleted?: boolean;
}
