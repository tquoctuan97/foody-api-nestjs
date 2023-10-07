import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateProductCategoryDto } from './create-product-category.dto';

export class UpdateProductCategoryDto extends PartialType(
  OmitType(CreateProductCategoryDto, ['storeId']),
) {}
