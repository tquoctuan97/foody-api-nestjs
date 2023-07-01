import { MinLength, Min } from 'class-validator';

export class CreateProductDto {
  @MinLength(5)
  title: string;

  @Min(1)
  price: number;
}
