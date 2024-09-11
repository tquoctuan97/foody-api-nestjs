import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Bill } from '../bills/entities/bill.entity';
import { InsightController } from './insight.controller';
import { InsightService } from './insight.service';
import { Customer } from '../customers/entities/customer.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Bill.name, schema: Bill }]),
    MongooseModule.forFeature([{ name: Customer.name, schema: Customer }]),
  ],
  providers: [InsightService],
  controllers: [InsightController],
})
export class InsightModule {}
