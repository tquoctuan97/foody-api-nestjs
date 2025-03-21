import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './modules/auth/auth.module';
import { BillsModule } from './modules/bills/bills.module';
import { CustomersModule } from './modules/customers/customers.module';
import { UsersModule } from './modules/users/users.module';
import { RetailersModule } from './modules/retailers/retailers.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { SupplierModule } from './modules/suppliers/supplier.module';
import { GoodsModule } from './modules/goods/goods.module';
import { SupplyOrderModule } from './modules/supply-orders/supply-order.module';
import { PurchaseOrdersModule } from './modules/purchase-orders/purchase-orders.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRoot(process.env.CONNECTIONSTRING),
    AuthModule,
    UsersModule,
    BillsModule,
    CustomersModule,
    RetailersModule,
    SupplierModule,
    SupplyOrderModule,
    GoodsModule,
    AuditLogsModule,
    PurchaseOrdersModule,
  ],
  // providers: [
  //   {
  //     provide: APP_INTERCEPTOR,
  //     useClass: TransformInterceptor,
  //   },
  // ],
})
export class AppModule {}
