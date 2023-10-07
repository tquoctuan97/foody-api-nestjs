import { Module } from '@nestjs/common';
import { StoresService } from './stores.service';
import { StoresPublicController } from './stores.public.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { StoreSchema } from './entities/store.entity';
import { StoresAdminController } from './stores.admin.controller';
import { ProductsModule } from '../products/products.module';
import { ProductCategoriesModule } from '../product-categories/product-categories.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Store', schema: StoreSchema }]),
    ProductsModule,
    ProductCategoriesModule,
  ],
  controllers: [StoresPublicController, StoresAdminController],
  providers: [StoresService],
})
export class StoresModule {}
