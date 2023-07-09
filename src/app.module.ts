import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ProductsModule } from './modules/products/products.module';
import { ConfigModule } from '@nestjs/config';
import { StoresModule } from './modules/stores/stores.module';
import { CuisinesModule } from './modules/cuisines/cuisines.module';
import { TransformInterceptor } from './transform.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';
@Module({
  imports: [
    ProductsModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRoot(process.env.CONNECTIONSTRING),
    StoresModule,
    CuisinesModule,
  ],
  // providers: [
  //   {
  //     provide: APP_INTERCEPTOR,
  //     useClass: TransformInterceptor,
  //   },
  // ],
})
export class AppModule {}
