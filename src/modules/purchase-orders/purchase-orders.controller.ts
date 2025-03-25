import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  Patch,
  Post,
  Query,
  Req,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  RETAILER_ID_HEADER,
  RETAILER_ROLE_KEY,
  RetailerRole,
  RetailerRoleGuard,
} from '../retailers/retailer-access.guard';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PurchaseOrderFilterDto } from './models/purchase-order.model';
import { PurchaseOrderDocument } from './entities/purchase-order.entity';

@ApiTags('Purchase Orders')
@ApiBearerAuth()
@ApiHeader({
  name: RETAILER_ID_HEADER,
  description: 'ID của retailer',
  required: true,
})
@UseGuards(RetailerRoleGuard)
@Controller('api/v1/admin/purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Post()
  @SetMetadata(RETAILER_ROLE_KEY, {
    roles: [RetailerRole.OWNER, RetailerRole.MOD],
  })
  @ApiOperation({ summary: 'Tạo mới đơn đặt hàng' })
  @ApiBody({ type: CreatePurchaseOrderDto })
  async create(
    @Body() createPurchaseOrderDto: CreatePurchaseOrderDto,
    @Req() req,
  ): Promise<PurchaseOrderDocument> {
    return this.purchaseOrdersService.create(createPurchaseOrderDto, req);
  }

  @Get()
  @SetMetadata(RETAILER_ROLE_KEY, {
    roles: [RetailerRole.OWNER, RetailerRole.MOD],
  })
  findAll(
    @Query() query: PurchaseOrderFilterDto,
    @Req() req,
    @Query('isDeleted', new ParseBoolPipe({ optional: true }))
    isDeleted?: boolean,
  ) {
    query.isDeleted = isDeleted;
    return this.purchaseOrdersService.findAll(query, req);
  }

  @Get(':id')
  @SetMetadata(RETAILER_ROLE_KEY, {
    roles: [RetailerRole.OWNER, RetailerRole.MOD],
  })
  findOne(
    @Param('id') id: string,
    @Req() req,
  ): Promise<PurchaseOrderDocument> {
    return this.purchaseOrdersService.findOne(id, req);
  }

  @Patch(':id')
  @SetMetadata(RETAILER_ROLE_KEY, {
    roles: [RetailerRole.OWNER, RetailerRole.MOD],
  })
  async update(
    @Param('id') id: string,
    @Body() updatePurchaseOrderDto: UpdatePurchaseOrderDto,
    @Req() req,
  ): Promise<PurchaseOrderDocument> {
    return this.purchaseOrdersService.update(id, updatePurchaseOrderDto, req);
  }

  @Delete(':id')
  @SetMetadata(RETAILER_ROLE_KEY, {
    roles: [RetailerRole.OWNER],
  })
  async remove(
    @Param('id') id: string,
    @Req() req,
  ): Promise<PurchaseOrderDocument> {
    return this.purchaseOrdersService.remove(id, req);
  }

  @Delete('hard-delete/:id')
  @SetMetadata(RETAILER_ROLE_KEY, {
    roles: [],
  })
  async hardDelete(
    @Param('id') id: string,
    @Req() req,
  ): Promise<PurchaseOrderDocument> {
    return this.purchaseOrdersService.hardDelete(id, req);
  }

  @Patch('restore/:id')
  @SetMetadata(RETAILER_ROLE_KEY, {
    roles: [RetailerRole.OWNER],
  })
  async restore(
    @Param('id') id: string,
    @Req() req,
  ): Promise<PurchaseOrderDocument> {
    return this.purchaseOrdersService.restore(id, req);
  }
} 