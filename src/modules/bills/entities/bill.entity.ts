import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Document, Types } from 'mongoose';
import { AdjustmentItem, BillItem } from '../dto/create-bill.dto';
import { BillListItemSchema } from './bill-item.schema';
import { User } from 'src/modules/users/entities/user.entity';
import { Customer } from 'src/modules/customers/entities/customer.entity';

@Schema({ timestamps: true, versionKey: false })
export class Bill extends Document {
  @ApiProperty({ type: String, format: 'date-time' })
  @Prop({ required: true })
  billDate: Date;

  @ApiProperty()
  @Prop({ required: true })
  customerName: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @Prop({ type: Types.ObjectId, ref: Customer.name, default: null })
  customerId: string;

  @ApiProperty({ type: [BillItem] })
  @Prop({ type: [BillListItemSchema], required: true })
  billList: BillItem[];

  @ApiProperty()
  @Prop({ required: true })
  sum: number;

  @ApiProperty({ type: [AdjustmentItem], default: [] })
  @Prop({ required: false, default: [] })
  adjustmentList: AdjustmentItem[];

  @ApiProperty()
  @Prop({ required: true })
  finalResult: number;

  @ApiPropertyOptional()
  @Prop({ type: Types.ObjectId, ref: User.name })
  createdBy: Types.ObjectId;

  @ApiPropertyOptional({ nullable: true })
  @Prop({ type: Types.ObjectId, ref: User.name, default: null })
  updatedBy: Types.ObjectId;

  @ApiPropertyOptional({ nullable: true })
  @Prop({ type: Types.ObjectId, ref: User.name, default: null })
  deletedBy: Types.ObjectId;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  @Prop({ required: false, default: null })
  deletedAt: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  createdAt?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  updatedAt?: Date;
}

export const BillSchema = SchemaFactory.createForClass(Bill);
