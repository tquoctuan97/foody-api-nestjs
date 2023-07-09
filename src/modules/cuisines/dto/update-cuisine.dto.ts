import { PartialType } from '@nestjs/swagger';
import { CreateCuisineDto } from './create-cuisine.dto';

export class UpdateCuisineDto extends PartialType(CreateCuisineDto) {}
