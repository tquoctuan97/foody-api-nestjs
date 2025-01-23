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
import { ApiBearerAuth } from '@nestjs/swagger';

import { SupplyOrderService } from './supply-order.service';
import {
  CreateSupplyOrderDto,
  SupplyOrderFilterDto,
  UpdateSupplyOrderDto,
} from './dto/supply-order.dto';
import { SupplyOrderDocument } from './entities/supply-order.entity';
import {
  RETAILER_ROLE_KEY,
  RetailerRole,
  RetailerRoleGuard,
} from '../retailers/retailer-access.guard';

@ApiBearerAuth()
@UseGuards(RetailerRoleGuard)
@Controller('api/v1/admin/supply-orders')
export class SupplyOrderController {
  constructor(private readonly supplyOrderService: SupplyOrderService) {}

  @Post()
  @SetMetadata(RETAILER_ROLE_KEY, {
    roles: [RetailerRole.OWNER, RetailerRole.MOD],
  })
  create(
    @Body() createSupplyOrderDto: CreateSupplyOrderDto,
    @Req() req: Request,
  ): Promise<SupplyOrderDocument> {
    return this.supplyOrderService.create(createSupplyOrderDto, req);
  }

  @Get()
  @SetMetadata(RETAILER_ROLE_KEY, {
    roles: [RetailerRole.OWNER, RetailerRole.MOD],
  })
  findAll(
    @Query() query: SupplyOrderFilterDto,
    @Req() req: Request,
    @Query('isDeleted', new ParseBoolPipe({ optional: true }))
    isDeleted?: boolean,
  ) {
    query.isDeleted = isDeleted;
    return this.supplyOrderService.findAll(query, req);
  }

  @Get(':id')
  @SetMetadata(RETAILER_ROLE_KEY, {
    roles: [RetailerRole.OWNER, RetailerRole.MOD],
  })
  findOne(@Param('id') id: string): Promise<SupplyOrderDocument> {
    return this.supplyOrderService.findOne(id);
  }

  @Patch(':id')
  @SetMetadata(RETAILER_ROLE_KEY, {
    roles: [RetailerRole.OWNER, RetailerRole.MOD],
  })
  update(
    @Param('id') id: string,
    @Body() updateSupplyOrderDto: UpdateSupplyOrderDto,
    @Req() req: Request,
  ): Promise<SupplyOrderDocument> {
    return this.supplyOrderService.update(id, updateSupplyOrderDto, req);
  }

  @Delete(':id')
  @SetMetadata(RETAILER_ROLE_KEY, {
    roles: [RetailerRole.OWNER, RetailerRole.MOD],
  })
  remove(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<SupplyOrderDocument> {
    return this.supplyOrderService.remove(id, req);
  }
}
