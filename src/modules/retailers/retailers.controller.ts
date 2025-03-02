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
import {
  CreateRetailerDto,
  RetailerFilterDto,
  UpdateRetailerDto,
} from './dto/retailer.dto';
import {
  RETAILER_ROLE_KEY,
  RetailerRole,
  RetailerRoleGuard,
} from './retailer-access.guard';
import { RetailerService } from './retailers.service';

@ApiBearerAuth()
@UseGuards(RetailerRoleGuard)
@Controller('api/v1/admin/retailers')
export class RetailerController {
  constructor(private readonly retailerService: RetailerService) {}

  @Post()
  @SetMetadata(RETAILER_ROLE_KEY, {
    roles: [],
  })
  create(@Body() createRetailerDto: CreateRetailerDto, @Req() req: Request) {
    return this.retailerService.create(createRetailerDto, req);
  }

  @Get()
  findAll(
    @Query() query: RetailerFilterDto,
    @Req() req: Request,
    @Query('isDeleted', new ParseBoolPipe({ optional: true }))
    isDeleted?: boolean,
  ) {
    query.isDeleted = isDeleted;
    return this.retailerService.findAll(query, req);
  }

  @Get(':id')
  @SetMetadata(RETAILER_ROLE_KEY, {
    roles: [RetailerRole.OWNER, RetailerRole.MOD],
  })
  findOne(@Param('id') id: string, @Req() req: Request) {
    return this.retailerService.findOne(id, req);
  }

  @Patch(':id')
  @SetMetadata(RETAILER_ROLE_KEY, {
    roles: [RetailerRole.OWNER],
  })
  async update(
    @Param('id') id: string,
    @Body() updateRetailerDto: UpdateRetailerDto,
    @Req() req: Request,
  ) {
    const updatedRetailer = await this.retailerService.update(
      id,
      updateRetailerDto,
      req,
    );

    return updatedRetailer;
  }

  @Delete('hard-delete/:id')
  @SetMetadata(RETAILER_ROLE_KEY, {
    roles: [],
  })
  async hardDelete(@Param('id') id: string, @Req() req: Request) {
    const updatedRetailer = await this.retailerService.hardDelete(id, req);

    return updatedRetailer;
  }

  @Patch('restore/:id')
  @SetMetadata(RETAILER_ROLE_KEY, {
    roles: [],
  })
  async unArchive(@Param('id') id: string, @Req() req: Request) {
    const updatedRetailer = await this.retailerService.unarchive(id, req);

    return updatedRetailer;
  }

  @Delete(':id')
  @SetMetadata(RETAILER_ROLE_KEY, {
    roles: [],
  })
  async remove(@Param('id') id: string, @Req() req: Request) {
    return this.retailerService.remove(id, req);
  }
}
