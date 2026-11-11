import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseArrayPipe,
  ParseBoolPipe,
  Patch,
  Post,
  Query,
  Request,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { IsObjectIdPipe } from 'src/common/is-object-id/is-object-id.pipe';
import { ExportProductsDto } from './dto/export-products.dto';
import {
  BulkDeleteProductsDto,
  BulkDeleteProductsResultDto,
} from './dto/bulk-delete-products.dto';
import {
  ImportProductItemDto,
  ImportProductsResultDto,
} from './dto/import-product.dto';
import { PaginatedProductResponse } from './dto/product-response.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { ProductListAllParams, ProductParams } from './models/product.model';
import { ProductsService } from './products.service';

@Controller('api/v1/admin/products')
@ApiTags('admin/products')
@ApiBearerAuth()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List products (paginated)' })
  @ApiOkResponse({ type: PaginatedProductResponse })
  getAll(
    @Query() query: ProductParams,
    @Query('isDeleted', new ParseBoolPipe({ optional: true }))
    isDeleted?: boolean,
  ) {
    query.isDeleted = isDeleted;
    return this.productsService.getAll(query);
  }

  @Get('all')
  @ApiOperation({ summary: 'List all products (no pagination)' })
  @ApiOkResponse({ type: Product, isArray: true })
  listAll(
    @Query() query: ProductListAllParams,
    @Query('isDeleted', new ParseBoolPipe({ optional: true }))
    isDeleted?: boolean,
  ) {
    query.isDeleted = isDeleted;
    return this.productsService.listAll(query);
  }

  @Post('import')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Upsert products. label → name. value = MongoDB id to update; else new id.',
  })
  @ApiBody({ type: [ImportProductItemDto] })
  @ApiOkResponse({ type: ImportProductsResultDto })
  importProducts(
    @Request() req,
    @Body(new ParseArrayPipe({ items: ImportProductItemDto }))
    items: ImportProductItemDto[],
  ) {
    return this.productsService.import(req.user, items);
  }

  @Post('export')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Download products as JSON. Omit ids to export every non-deleted product.',
  })
  @ApiProduces('application/json')
  @ApiOkResponse({
    schema: { type: 'string', format: 'binary' },
  })
  async exportProducts(@Body() body: ExportProductsDto) {
    const items = await this.productsService.export(body?.ids);
    return new StreamableFile(Buffer.from(JSON.stringify(items, null, 2)), {
      type: 'application/json; charset=utf-8',
      disposition: 'attachment; filename="products.json"',
    });
  }

  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete multiple products by id' })
  @ApiOkResponse({ type: BulkDeleteProductsResultDto })
  bulkDelete(@Request() req, @Body() body: BulkDeleteProductsDto) {
    return this.productsService.deleteMany(req.user, body.ids);
  }

  @Delete('all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Soft-delete all non-deleted products (admin: all; user: own only)',
  })
  @ApiOkResponse({ type: BulkDeleteProductsResultDto })
  deleteAll(@Request() req) {
    return this.productsService.deleteAll(req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by id' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: Product })
  getOne(@Param('id', IsObjectIdPipe) id: string) {
    return this.productsService.getOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a product' })
  @ApiCreatedResponse({ type: Product })
  create(@Request() req, @Body() createProductDto: CreateProductDto) {
    return this.productsService.create(req.user, createProductDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: Product })
  update(
    @Request() req,
    @Param('id', IsObjectIdPipe) id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(req.user, id, updateProductDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a product' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: Product })
  delete(@Request() req, @Param('id', IsObjectIdPipe) id: string) {
    return this.productsService.delete(req.user, id);
  }
}
