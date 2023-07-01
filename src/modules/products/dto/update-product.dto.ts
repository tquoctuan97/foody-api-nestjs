import { MinLength, Min } from 'class-validator';

export class UpdateProductDto {
  @MinLength(5)
  title: string;

  @Min(1)
  price: number;
}
