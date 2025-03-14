import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from 'src/modules/users/entities/user.entity';

export type CustomerDocument = Customer & Document;

@Schema({ timestamps: true, versionKey: false })
export class Customer extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Retailer' })
  retailerId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  displayName: string;

  @Prop({ required: false, trim: true, default: null })
  profileSrc: string;

  @Prop({ required: false, trim: true, default: null })
  phoneNumber: number | null;

  @Prop({ required: true })
  slug: string;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ required: false, default: null })
  deletedAt: Date | null;

  @Prop({ type: Types.ObjectId, ref: User.name })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name, default: null })
  lastUpdatedBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name, default: null })
  deletedBy: Types.ObjectId;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);
