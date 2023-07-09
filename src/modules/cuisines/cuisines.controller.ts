import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CuisinesService } from './cuisines.service';
import { CreateCuisineDto } from './dto/create-cuisine.dto';
import { UpdateCuisineDto } from './dto/update-cuisine.dto';
import { Cuisine } from './entities/cuisine.entity';
import { ApiTags } from '@nestjs/swagger';

@Controller('cuisines')
@ApiTags('cuisines')
export class CuisinesController {
  constructor(private readonly cuisinesService: CuisinesService) {}

  @Post()
  create(@Body() createCuisineDto: CreateCuisineDto) {
    return this.cuisinesService.create(createCuisineDto);
  }

  @Get()
  findAll(): Promise<Cuisine[]> {
    return this.cuisinesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Cuisine> {
    return this.cuisinesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCuisineDto: UpdateCuisineDto) {
    return this.cuisinesService.update(id, updateCuisineDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.cuisinesService.remove(id);
  }
}
