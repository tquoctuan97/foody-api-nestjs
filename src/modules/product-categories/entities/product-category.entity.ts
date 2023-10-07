import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Store } from 'src/modules/stores/entities/store.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { ProductCategoryStatus } from '../models/product-category.model';

@Schema({ timestamps: true, versionKey: false })
export class ProductCategory extends Document {
  @Prop({
    minlength: 3,
  })
  name: string;

  @Prop({
    enum: Object.values(ProductCategoryStatus),
    default: ProductCategoryStatus.PUBLISHED,
  })
  status: string;

  @Prop({ required: false, default: '' })
  imageURL: string;

  @Prop({ type: Types.ObjectId, ref: Store.name })
  storeId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name })
  createdBy: Types.ObjectId;
}

export const ProductCategorySchema =
  SchemaFactory.createForClass(ProductCategory);
