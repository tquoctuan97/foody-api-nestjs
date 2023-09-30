import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import slugify from 'slugify';
import { PaginationDto } from 'src/common/pagination/pagination.dto';
import { generateRandomSlug } from 'src/utils';
import { Role } from '../users/models/user.model';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { Store } from './entities/store.entity';
import { StoreAdminParams, StoreStatus } from './models/store.model';

@Injectable()
export class StoresService {
  constructor(
    @InjectModel(Store.name) private readonly storeModel: Model<Store>,
  ) {}

  async create(createStoreDto: CreateStoreDto, ownerId: string) {
    let slug = slugify(createStoreDto.slug || createStoreDto.name);

    const isExist = await this.storeModel.findOne({ slug });

    if (isExist) {
      slug = `${slug}-${generateRandomSlug()}`;
    }

    const result = await this.storeModel.create({
      ...createStoreDto,
      cuisines: createStoreDto.cuisineIds?.map((id) => new Types.ObjectId(id)),
      slug,
      owner: new Types.ObjectId(ownerId),
    });

    return result;
  }

  async findAll(query?: StoreAdminParams): Promise<PaginationDto<Store[]>> {
    // sort from value of sort query
    // if sort is not provided, sort by createdAt in descending order
    // + for ascending, - for descending
    const currentPage = parseInt(query.page) || 1;
    const pageSize = parseInt(query.pageSize) || 10;

    const queryStore = {
      name: new RegExp(query.search || '', 'i'),
      status: new RegExp(query.status || '', 'i'),
      // filter by cuisine string ids are separated by |
      // if cuisineIds is not provided, return all stores
      ...(query.cuisine && {
        cuisines: {
          $in: query.cuisine.split('|').map((id) => new Types.ObjectId(id)),
        },
      }),
      ...(query.owner && {
        owner: {
          $in: query.owner.split('|').map((id) => new Types.ObjectId(id)),
        },
      }),
      ...(query?.user?.role === Role.USER && {
        owner: new Types.ObjectId(query.user.id),
      }),
    };

    const totalCount = await this.storeModel.countDocuments(queryStore);

    const data = await this.storeModel
      .find(queryStore)
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize)
      .sort(query.sort || '-createdAt')
      .populate({
        path: 'cuisines',
        transform: (cuisine) => ({ _id: cuisine._id, name: cuisine.name }),
      })
      .populate({
        path: 'owner',
        transform: (user) => ({
          _id: user._id,
          name: user.name,
          avatar: user.avatar,
        }),
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
  async findOne(slug: string): Promise<Store> {
    return this.storeModel
      .findOne({ slug, status: StoreStatus.PUBLISHED })
      .populate({
        path: 'cuisines',
        transform: (cuisine) => ({ _id: cuisine._id, name: cuisine.name }),
      })
      .populate({
        path: 'owner',
        transform: (user) => ({
          _id: user._id,
          name: user.name,
          avatar: user.avatar,
        }),
      })
      .exec();
  }

  async update(
    id: string,
    updateStoreDto: UpdateStoreDto,
    user: { id: string; role: Role },
  ) {
    const store = await this.storeModel.findById(id);

    if (user.role !== Role.ADMIN && store.owner.toString() !== user.id) {
      throw new ForbiddenException();
    }

    await this.storeModel.findByIdAndUpdate(id, updateStoreDto);
    const result = await this.storeModel.findById(id);
    return result;
  }

  async remove(id: string, user: { id: string; role: Role }) {
    const store = await this.storeModel.findById(id);

    if (user.role !== Role.ADMIN && store.owner.toString() !== user.id) {
      throw new ForbiddenException();
    }

    return this.storeModel.findByIdAndDelete(id);
  }
}
