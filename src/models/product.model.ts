import { ApiProperty } from '@nestjs/swagger';
export class Product {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  price: number;

  constructor(id: string, title: string, price: number) {
    if (id !== null) this.id = id;
    this.title = title;
    this.price = price;
  }
}
