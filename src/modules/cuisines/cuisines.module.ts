import { Module } from '@nestjs/common';
import { CuisinesService } from './cuisines.service';
import { CuisinesController } from './cuisines.controller';
import { Cuisine, CuisineSchema } from './entities/cuisine.entity';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Cuisine.name, schema: CuisineSchema }]),
  ],
  controllers: [CuisinesController],
  providers: [CuisinesService],
})
export class CuisinesModule {}
