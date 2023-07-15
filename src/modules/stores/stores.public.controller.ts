import { Controller, Get, Param, Query } from '@nestjs/common';
import { StoresService } from './stores.service';
import { ApiTags } from '@nestjs/swagger';
import { StorePublicParams, StoreStatus } from './models/store.model';
import { Public } from '../auth/decorators/public.decorator';

@Controller('api/v1/public/stores')
@ApiTags('public/stores')
export class StoresPublicController {
  constructor(private readonly storesService: StoresService) {}

  @Public()
  @Get()
  findAll(@Query() params: StorePublicParams) {
    return this.storesService.findAll({
      ...params,
      status: StoreStatus.PUBLISHED,
    });
  }

  @Public()
  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.storesService.findOne(slug);
  }
}
