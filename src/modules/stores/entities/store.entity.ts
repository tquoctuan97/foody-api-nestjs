import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { StoreStatus } from '../models/store.model';
import { Cuisine } from 'src/modules/cuisines/entities/cuisine.entity';
import { Min } from 'class-validator';
import { User } from 'src/modules/users/entities/store.entity';

export type Location = {
  address: string;
  wardId: Types.ObjectId;
  districtId: Types.ObjectId;
  provinceId: Types.ObjectId;
};

@Schema({ timestamps: true, versionKey: false })
export class Store extends Document {
  @ApiProperty()
  @Prop({ required: true })
  name: string;

  @ApiProperty()
  @Prop({ required: true, unique: true })
  slug: string;

  @ApiProperty()
  @Prop({ enum: Object.values(StoreStatus), default: StoreStatus.DRAFT })
  status: string;

  @ApiProperty()
  @Prop({ required: true })
  @Min(0)
  layout: number;

  @ApiProperty()
  @Prop({ required: true })
  thumbnail: string;

  @ApiProperty()
  @Prop({ type: Object })
  location: Location;

  @ApiProperty()
  @Prop({ type: [{ type: Types.ObjectId, ref: Cuisine.name }] })
  cuisines: Types.ObjectId[];

  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: User.name })
  owner: Types.ObjectId;
}

export const StoreSchema = SchemaFactory.createForClass(Store);
