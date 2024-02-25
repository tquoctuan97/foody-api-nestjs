import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { BillsController } from './bills.controller';
import { BillsService } from './bills.service';
import { Bill, BillSchema } from './entities/bill.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Bill.name, schema: BillSchema }]),
  ],
  controllers: [BillsController],
  providers: [BillsService],
  exports: [BillsService],
})
export class BillsModule {}
