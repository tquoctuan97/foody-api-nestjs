import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RetailerDocument = Retailer & Document;

@Schema({ timestamps: true, versionKey: false })
export class Retailer extends Document {
  @Prop({ type: String, required: true, unique: true, index: true })
  name: string;

  @Prop({ required: true, default: null })
  address: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  ownerId: Types.ObjectId;

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  modIds: Types.ObjectId[];

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ default: null, type: Date })
  deletedAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  lastUpdatedBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  deletedBy: Types.ObjectId;
}

export const RetailerSchema = SchemaFactory.createForClass(Retailer);
