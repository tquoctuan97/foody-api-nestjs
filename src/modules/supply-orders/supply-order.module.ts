import { Module } from '@nestjs/common';
import { SupplyOrderService } from './supply-order.service';
import { SupplyOrderController } from './supply-order.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { SupplyOrder, SupplyOrderSchema } from './entities/supply-order.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SupplyOrder.name, schema: SupplyOrderSchema },
    ]),
    AuditLogsModule,
    UsersModule,
  ],
  controllers: [SupplyOrderController],
  exports: [SupplyOrderService],
  providers: [SupplyOrderService],
})
export class SupplyOrderModule {}
