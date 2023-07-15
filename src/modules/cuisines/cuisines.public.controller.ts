import { Controller, Get, Query } from '@nestjs/common';
import { CuisinesService } from './cuisines.service';
import { Cuisine } from './entities/cuisine.entity';
import { ApiTags } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/pagination/pagination.dto';
import { PaginationParams } from 'src/common/pagination/pagination.model';
import { Public } from '../auth/decorators/public.decorator';

@Controller('api/v1/public/cuisines')
@ApiTags('public/cuisines')
export class CuisinesPublicController {
  constructor(private readonly cuisinesService: CuisinesService) {}

  @Public()
  @Get()
  findAll(
    @Query() params: PaginationParams,
  ): Promise<PaginationDto<Cuisine[]>> {
    return this.cuisinesService.findAll(params);
  }
}
