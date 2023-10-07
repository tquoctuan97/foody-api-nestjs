import { ApiProperty } from '@nestjs/swagger';
import { MinLength } from 'class-validator';
import { ProductCategoryStatus } from '../models/product-category.model';

export class CreateProductCategoryDto {
  @ApiProperty({
    minLength: 3,
  })
  @MinLength(3)
  name: string;

  @ApiProperty({
    required: false,
    default: ProductCategoryStatus.PUBLISHED,
    enum: Object.values(ProductCategoryStatus),
  })
  status: string;

  @ApiProperty({
    required: false,
    default: '',
  })
  imageUrl: string;

  @ApiProperty()
  storeId: string;
}
