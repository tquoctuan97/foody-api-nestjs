import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Product } from 'src/modules/products/entities/product.entity';

@Schema({ _id: false, versionKey: false })
export class BillListItem {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  total: number;

  @Prop({ type: Types.ObjectId, ref: Product.name, default: null })
  productId?: Types.ObjectId | null;
}

export const BillListItemSchema = SchemaFactory.createForClass(BillListItem);
