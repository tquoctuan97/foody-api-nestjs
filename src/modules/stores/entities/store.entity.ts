import mongoose from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { StoreStatus } from '../models/store.model';

export const StoreSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: Object.values(StoreStatus),
      default: StoreStatus.DRAFT,
    },
    thumbnail: { type: String, required: true },
    update_at: { type: Date, default: Date.now },
    create_at: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

export class Store {
  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  thumbnail: string;

  @ApiProperty()
  update_at: Date;

  @ApiProperty()
  create_at: Date;
}
