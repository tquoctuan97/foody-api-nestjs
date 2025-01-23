import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { CreateSupplyOrderItemDto } from '../dto/supply-order.dto';

export type SupplyOrderDocument = SupplyOrder & Document;

@Schema({ timestamps: true, versionKey: false })
export class SupplyOrder extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Retailer' })
  retailerId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Supplier' })
  supplierId: Types.ObjectId;

  @Prop({ required: true })
  orderDate: Date;

  @Prop({
    type: [
      {
        goodId: { type: Types.ObjectId, ref: 'Good' },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true },
        total: { type: Number, required: true },
      },
    ],
  })
  items: CreateSupplyOrderItemDto[];

  @Prop({ required: true, default: 0 })
  totalAmount: number;

  @Prop({ required: true, default: 0 })
  paid: number;

  @Prop({ required: true, default: 0 })
  debt: number;

  @Prop({ default: false })
  isPaidComplete: boolean;

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

export const SupplyOrderSchema = SchemaFactory.createForClass(SupplyOrder);
