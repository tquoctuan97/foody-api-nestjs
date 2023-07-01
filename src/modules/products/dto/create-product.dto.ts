import { MinLength, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty()
  @MinLength(5)
  title: string;

  @ApiProperty({
    minimum: 1,
  })
  @Min(1)
  price: number;
}
