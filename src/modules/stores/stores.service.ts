import { Injectable } from '@nestjs/common';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Store } from './entities/store.entity';
import slugify from 'slugify';
import { StoreParams } from './models/store.model';

@Injectable()
export class StoresService {
  constructor(
    @InjectModel('Store') private readonly storeModel: Model<Store>,
  ) {}

  async create(createStoreDto: CreateStoreDto) {
    let slug = slugify(createStoreDto.slug || createStoreDto.name);

    const isExist = await this.storeModel.findOne({ slug });

    if (isExist) {
      const count = await this.storeModel.countDocuments({
        slug: new RegExp(`^${slug}(-[0-9]*)?$`, 'i'),
      });

      slug = `${slug}-${count + 1}`;
    }

    const result = await this.storeModel.create({ ...createStoreDto, slug });
    return result._id;
  }

  findAll(query?: StoreParams) {
    return this.storeModel.find({
      name: new RegExp(query.search || '', 'i'),
      status: new RegExp(query.status || '', 'i'),
    });
  }

  findOne(slug: string) {
    return this.storeModel.findOne({ slug });
  }

  async update(id: string, updateStoreDto: UpdateStoreDto) {
    await this.storeModel.findByIdAndUpdate(id, updateStoreDto);
    const result = await this.storeModel.findById(id);
    return result;
  }

  remove(id: string) {
    return this.storeModel.findByIdAndDelete(id);
  }
}
