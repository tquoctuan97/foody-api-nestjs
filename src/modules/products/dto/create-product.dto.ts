import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Cà phê sữa' })
  @IsString()
  @IsNotEmpty()
  name: string;
}
