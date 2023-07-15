import { Module } from '@nestjs/common';
import { CuisinesService } from './cuisines.service';
import { Cuisine, CuisineSchema } from './entities/cuisine.entity';
import { MongooseModule } from '@nestjs/mongoose';
import { CuisinesAdminController } from './cuisines.admin.controller';
import { CuisinesPublicController } from './cuisines.public.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Cuisine.name, schema: CuisineSchema }]),
  ],
  controllers: [CuisinesPublicController, CuisinesAdminController],
  providers: [CuisinesService],
})
export class CuisinesModule {}
