import { Module } from '@nestjs/common';
import { GoodService } from './goods.service';
import { GoodController } from './goods.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { Good, GoodSchema } from './entities/goods.entity';
import { UsersModule } from '../users/users.module';
import { RetailersModule } from '../retailers/retailers.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Good.name, schema: GoodSchema }]),
    AuditLogsModule,
    UsersModule,
    RetailersModule,
  ],
  controllers: [GoodController],
  providers: [GoodService],
})
export class GoodsModule {}
