import { Injectable } from '@nestjs/common';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Store } from './entities/store.entity';
import slugify from 'slugify';
import { StoreParams } from './models/store.model';
import { PaginationDto } from 'src/common/pagination/pagination.dto';

@Injectable()
export class StoresService {
  constructor(
    @InjectModel(Store.name) private readonly storeModel: Model<Store>,
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

    const result = await this.storeModel.create({
      ...createStoreDto,
      cuisines: createStoreDto.cuisineIds,
      slug,
    });

    return result;
  }

  async findAll(query?: StoreParams): Promise<PaginationDto<Store[]>> {
    // sort from value of sort query
    // if sort is not provided, sort by createdAt in descending order
    // + for ascending, - for descending
    const currentPage = parseInt(query.page) || 1;
    const pageSize = parseInt(query.pageSize) || 10;
    const totalCount = await this.storeModel.countDocuments();

    const data = await this.storeModel
      .find({
        name: new RegExp(query.search || '', 'i'),
        status: new RegExp(query.status || '', 'i'),
        // filter by cuisine string ids are separated by |
        // if cuisineIds is not provided, return all stores
        ...(query.cuisine && {
          cuisines: { $in: query.cuisine.split('|') },
        }),
      })
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize)
      .sort(query.sort || '-createdAt')
      .populate({
        path: 'cuisines',
        transform: (cuisine) => ({ _id: cuisine._id, name: cuisine.name }),
      })
      .lean<Store[]>()
      .exec();

    const response = new PaginationDto<Store[]>(data, {
      pageSize: pageSize,
      currentPage: currentPage,
      // count total number of pages
      totalPages: Math.ceil(totalCount / pageSize),
      // count total number of stores in database
      totalCount: totalCount,
      // check if there is next page
      hasNextPage: currentPage < Math.ceil(totalCount / pageSize),
    });

    return response;
  }

  // return a store with cuisine name
  findOne(slug: string) {
    return this.storeModel.findOne({ slug }).exec();
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
