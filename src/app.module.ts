import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { StoresModule } from './modules/stores/stores.module';
import { CuisinesModule } from './modules/cuisines/cuisines.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProductsModule } from './modules/products/products.module';
import { ProductCategoriesModule } from './modules/product-categories/product-categories.module';
import { BillsModule } from './modules/bills/bills.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRoot(process.env.CONNECTIONSTRING),
    ProductsModule,
    StoresModule,
    CuisinesModule,
    AuthModule,
    UsersModule,
    ProductCategoriesModule,
    BillsModule,
  ],
  // providers: [
  //   {
  //     provide: APP_INTERCEPTOR,
  //     useClass: TransformInterceptor,
  //   },
  // ],
})
export class AppModule {}
