import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BillItem } from '../dto/create-bill.dto';
import { User } from 'src/modules/users/entities/user.entity';

@Schema({ timestamps: true, versionKey: false })
export class Bill extends Document {
  @Prop({ required: true })
  billDate: Date;

  @Prop({ required: true })
  customerName: string;

  @Prop({ required: true })
  billList: BillItem[];

  @Prop({ required: true })
  sum: number;

  @Prop({ required: false, default: null })
  debt: number | null;

  @Prop({ required: false, default: null })
  prePay: number | null;

  @Prop({ required: true })
  finalResult: number;

  @Prop({ type: Types.ObjectId, ref: User.name })
  createdBy: Types.ObjectId;

  @Prop({ required: false, default: null })
  deletedAt: Date | null;
}

export const BillSchema = SchemaFactory.createForClass(Bill);
