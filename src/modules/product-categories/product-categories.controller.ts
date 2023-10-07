import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { ProductCategoryParams } from './models/product-category.model';
import { ProductCategoriesService } from './product-categories.service';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';

@Controller('api/v1/admin/product-categories')
@ApiTags('admin/product-categories')
export class ProductCategoriesController {
  constructor(
    private readonly ProductCategoriesService: ProductCategoriesService,
  ) {}

  @Post()
  create(
    @Request() req,
    @Body() CreateProductCategoryDto: CreateProductCategoryDto,
  ) {
    return this.ProductCategoriesService.create(
      req.user,
      CreateProductCategoryDto,
    );
  }

  @Get()
  findAll(@Query() params: ProductCategoryParams) {
    return this.ProductCategoriesService.findAll(params);
  }

  @Patch(':id')
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateProductCategoryDto: UpdateProductCategoryDto,
  ) {
    return this.ProductCategoriesService.update(
      req.user,
      id,
      updateProductCategoryDto,
    );
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.ProductCategoriesService.remove(req.user, id);
  }
}
