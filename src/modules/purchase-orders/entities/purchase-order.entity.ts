import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Customer } from 'src/modules/customers/entities/customer.entity';
import { Good } from 'src/modules/goods/entities/goods.entity';
import { User } from 'src/modules/users/entities/user.entity';

export type PurchaseOrderDocument = PurchaseOrder & Document;

// Định nghĩa item trong đơn hàng
export class PurchaseOrderItem {
  @Prop({ type: Types.ObjectId, ref: Good.name })
  goodId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true })
  total: number;
}

// Định nghĩa khoản điều chỉnh
export class AdjustmentItem {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: ['add', 'subtract'] })
  type: 'add' | 'subtract';

  @Prop({ required: true })
  amount: number;
}

// Enum định nghĩa trạng thái đơn hàng
export enum PurchaseOrderStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Schema({ timestamps: true, versionKey: false })
export class PurchaseOrder extends Document {
  @Prop({ required: true })
  orderDate: Date;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Retailer' })
  retailerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Customer.name, required: true })
  customerId: Types.ObjectId;

  @Prop({ required: true, type: [PurchaseOrderItem] })
  items: PurchaseOrderItem[];

  @Prop({
    required: true,
    description:
      'Tổng tiền trước khi áp dụng các khoản điều chỉnh (được tính bằng tổng của các items)',
  })
  subtotal: number;

  @Prop({ required: false, default: [] })
  adjustmentList: AdjustmentItem[];

  @Prop({ required: true })
  total: number;

  @Prop({
    required: true,
    enum: PurchaseOrderStatus,
    default: PurchaseOrderStatus.DRAFT,
  })
  status: PurchaseOrderStatus;

  @Prop({ required: false, default: null })
  notes: string;

  @Prop({ type: Types.ObjectId, ref: User.name })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name, default: null })
  updatedBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name, default: null })
  lastUpdatedBy: Types.ObjectId;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ default: null, type: Date })
  deletedAt: Date;
}

export const PurchaseOrderSchema = SchemaFactory.createForClass(PurchaseOrder);
