import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from 'src/modules/users/entities/user.entity';

@Schema({ timestamps: true, versionKey: false })
export class Customer extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  displayName: string;

  @Prop({ required: false, default: null })
  phoneNumber: number | null;

  @Prop({ required: true })
  slug: string;

  @Prop({ type: Types.ObjectId, ref: User.name })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name, default: null })
  updatedBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name, default: null })
  deletedBy: Types.ObjectId;

  @Prop({ required: false, default: null })
  deletedAt: Date | null;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);
