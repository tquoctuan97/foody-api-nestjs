import { Module } from '@nestjs/common';
import { SupplierService } from './supplier.service';
import { SupplierController } from './supplier.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { Supplier, SupplierSchema } from './entities/supplier.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Supplier.name, schema: SupplierSchema },
    ]),
    AuditLogsModule,
    UsersModule,
  ],
  controllers: [SupplierController],
  exports: [SupplierService],
  providers: [SupplierService],
})
export class SupplierModule {}
