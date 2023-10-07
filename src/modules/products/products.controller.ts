import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { ProductsService } from './products.service';
import { ProductCategoryParams } from './models/product.model';

@Controller('api/v1/admin/products')
@ApiTags('admin/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  getAll(@Query() query: ProductCategoryParams) {
    return this.productsService.getAll(query);
  }

  @Post()
  @ApiCreatedResponse({
    type: Product,
  })
  create(@Request() req, @Body() createProductDto: CreateProductDto) {
    return this.productsService.create(req.user, createProductDto);
  }

  @Put(':id')
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(req.user, id, updateProductDto);
  }

  @Delete(':id')
  delete(@Request() req, @Param('id') id: string) {
    return this.productsService.delete(req.user, id);
  }
}
