import { Module } from '@nestjs/common';
import { StoresService } from './stores.service';
import { StoresController } from './stores.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { StoreSchema } from './entities/store.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Store', schema: StoreSchema }]),
  ],
  controllers: [StoresController],
  providers: [StoresService],
})
export class StoresModule {}
