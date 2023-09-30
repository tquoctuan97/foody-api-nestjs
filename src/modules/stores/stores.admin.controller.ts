import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Request,
} from '@nestjs/common';
import { StoresService } from './stores.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { ApiTags } from '@nestjs/swagger';
import { StoreAdminParams } from './models/store.model';

@Controller('api/v1/admin/stores')
@ApiTags('admin/stores')
export class StoresAdminController {
  constructor(private readonly storesService: StoresService) {}

  @Post()
  create(@Request() req, @Body() createStoreDto: CreateStoreDto) {
    return this.storesService.create(createStoreDto, req.user.id);
  }

  @Get()
  findAll(@Request() req, @Query() params: StoreAdminParams) {
    return this.storesService.findAll({
      ...params,
      user: {
        id: req.user.id,
        role: req.user.role,
      },
    });
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.storesService.findOne(slug);
  }

  @Patch(':id')
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateStoreDto: UpdateStoreDto,
  ) {
    return this.storesService.update(id, updateStoreDto, req.user);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.storesService.remove(id, req.user);
  }
}
