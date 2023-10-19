import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ProductCategory } from 'src/modules/product-categories/entities/product-category.entity';
import { Store } from 'src/modules/stores/entities/store.entity';
import { ProductStatus } from '../models/product.model';
import { User } from 'src/modules/users/entities/user.entity';

@Schema({ timestamps: true, versionKey: false })
export class Product extends Document {
  @Prop({
    minlength: 3,
  })
  name: string;

  @Prop({ required: false, default: '' })
  description: string;

  @Prop({
    min: 0,
  })
  price: number;

  @Prop({
    enum: Object.values(ProductStatus),
    default: ProductStatus.PUBLISHED,
  })
  status: string;

  @Prop({ default: null })
  imageUrl: string;

  @Prop({ type: Types.ObjectId, ref: ProductCategory.name })
  category: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Store.name })
  store: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name })
  createdBy: Types.ObjectId;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
