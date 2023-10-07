import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUrl, Min, MinLength } from 'class-validator';
import { ProductStatus } from '../models/product.model';

export class CreateProductDto {
  @ApiProperty()
  @MinLength(3)
  name: string;

  @ApiProperty({
    required: false,
    default: '',
  })
  @IsOptional()
  description: string;

  @ApiProperty({
    minimum: 1,
  })
  @Min(1)
  price: number;

  @ApiProperty({
    required: false,
    default: ProductStatus.PUBLISHED,
    enum: Object.values(ProductStatus),
  })
  @IsOptional()
  status: string;

  @ApiProperty({
    required: false,
    default: null,
  })
  @IsOptional()
  @IsUrl()
  imageUrl: string;

  @ApiProperty()
  categoryId: string;

  @ApiProperty()
  storeId: string;
}
