import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
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
import { AttachmentModule } from './modules/attachments/attachment.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRoot(process.env.CONNECTIONSTRING),
    // Cấu hình thư mục tĩnh để phục vụ uploads
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'),
      serveRoot: '/',
      serveStaticOptions: {
        index: false, // Không liệt kê thư mục
        maxAge: 86400000, // Cache 1 ngày 
      },
    }),
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
    AttachmentModule,
  ],
  // providers: [
  //   {
  //     provide: APP_INTERCEPTOR,
  //     useClass: TransformInterceptor,
  //   },
  // ],
})
export class AppModule {}
