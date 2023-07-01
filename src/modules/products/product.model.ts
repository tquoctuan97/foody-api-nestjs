import { ApiProperty } from '@nestjs/swagger';
import * as mongoose from 'mongoose';

export const ProductSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    price: { type: Number, required: true },
  },
  { versionKey: false },
);

export class Product {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  price: number;
}
