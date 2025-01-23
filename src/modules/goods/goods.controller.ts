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
import { GoodService } from './goods.service';

import { ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { CreateGoodDto, GoodFilterDto, UpdateGoodDto } from './dto/goods.dto';
import { GoodDocument } from './entities/goods.entity';
import {
  RETAILER_ROLE_KEY,
  RetailerRole,
  RetailerRoleGuard,
} from '../retailers/retailer-access.guard';

interface AuthenticatedRequest extends Request {
  user?: {
    _id?: string;
    retailerId: string;
  };
}

@ApiBearerAuth()
@UseGuards(RetailerRoleGuard)
@Controller('api/v1/admin/goods')
export class GoodController {
  constructor(private readonly goodService: GoodService) {}

  @Post()
  @SetMetadata(RETAILER_ROLE_KEY, {
    roles: [RetailerRole.OWNER, RetailerRole.MOD],
  })
  async create(
    @Body() createGoodDto: CreateGoodDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<GoodDocument> {
    return await this.goodService.create(createGoodDto, req);
  }

  @Get()
  @SetMetadata(RETAILER_ROLE_KEY, {
    roles: [RetailerRole.OWNER, RetailerRole.MOD],
  })
  findAll(
    @Query() query: GoodFilterDto,
    @Req() req: Request,
    @Query('isDeleted', new ParseBoolPipe({ optional: true }))
    isDeleted?: boolean,
  ) {
    query.isDeleted = isDeleted;
    return this.goodService.findAll(query, req);
  }

  @Get(':id')
  @SetMetadata(RETAILER_ROLE_KEY, {
    roles: [RetailerRole.OWNER, RetailerRole.MOD],
  })
  findOne(@Param('id') id: string): Promise<GoodDocument> {
    return this.goodService.findOne(id);
  }

  @Patch(':id')
  @SetMetadata(RETAILER_ROLE_KEY, {
    roles: [RetailerRole.OWNER, RetailerRole.MOD],
  })
  async update(
    @Param('id') id: string,
    @Body() updateGoodDto: UpdateGoodDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<GoodDocument> {
    return await this.goodService.update(id, updateGoodDto, req);
  }

  @Delete(':id')
  @SetMetadata(RETAILER_ROLE_KEY, {
    roles: [RetailerRole.OWNER, RetailerRole.MOD],
  })
  async remove(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<GoodDocument> {
    return await this.goodService.remove(id, req);
  }
}
