import { ApiProperty } from '@nestjs/swagger';
import { PaginationParams } from 'src/common/pagination/pagination.model';

export enum ProductCategoryStatus {
  PUBLISHED = 'published',
  PRIVATE = 'private',
  DRAFT = 'draft',
}

export class ProductCategoryParams extends PaginationParams {
  @ApiProperty({
    required: true,
  })
  storeId: string;

  @ApiProperty({
    required: false,
    default: ProductCategoryStatus.PUBLISHED,
    enum: Object.values(ProductCategoryStatus),
  })
  status: string;
}
