import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SupplierDocument = Supplier & Document;

@Schema({ timestamps: true, versionKey: false })
export class Supplier extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Retailer' })
  retailerId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ type: String })
  contact: string;

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

export const SupplierSchema = SchemaFactory.createForClass(Supplier);
