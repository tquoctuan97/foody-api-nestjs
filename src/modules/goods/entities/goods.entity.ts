import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type GoodDocument = Good & Document;

@Schema({
  timestamps: true,
  versionKey: false,
})
export class Good extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Retailer' })
  retailerId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  name: string;

  @Prop()
  description: string;

  @Prop()
  category: string;

  @Prop()
  unit: string;

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

export const GoodSchema = SchemaFactory.createForClass(Good);
