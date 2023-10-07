import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserRequest } from '../auth/models/auth.model';
import { Role } from '../users/models/user.model';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { ProductCategory } from './entities/product-category.entity';
import { ProductCategoryParams } from './models/product-category.model';
import { PaginationDto } from 'src/common/pagination/pagination.dto';

@Injectable()
export class ProductCategoriesService {
  constructor(
    @InjectModel(ProductCategory.name)
    private readonly productCategoryModel: Model<ProductCategory>,
  ) {}

  create(
    user: UserRequest,
    CreateProductCategoryDto: CreateProductCategoryDto,
  ) {
    const { name, status, imageUrl, storeId } = CreateProductCategoryDto;

    const newProductCategory = new this.productCategoryModel({
      name: name.trim(),
      status,
      imageUrl,
      store: new Types.ObjectId(storeId),
      createdBy: new Types.ObjectId(user.id),
    });

    return newProductCategory.save();
  }

  async findAll(query: ProductCategoryParams) {
    const currentPage = parseInt(query?.page) || 1;
    const pageSize = parseInt(query?.pageSize) || 10;

    const queryStore = {
      name: new RegExp(query?.search || '', 'i'),
      status: new RegExp(query?.status || '', 'i'),
      store: new Types.ObjectId(query.storeId),
    };

    const totalCount = await this.productCategoryModel.countDocuments(
      queryStore,
    );

    const data = await this.productCategoryModel
      .find(queryStore)
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize)
      .sort(query.sort || '-createdAt')
      .select('-store')
      .lean<ProductCategory[]>()
      .exec();

    const response = new PaginationDto<ProductCategory[]>(data, {
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

  async update(
    user: UserRequest,
    id: string,
    updateProductCategoryDto: UpdateProductCategoryDto,
  ) {
    const productCategory = await this.productCategoryModel.findById(id);

    if (
      user.role !== Role.ADMIN &&
      productCategory.createdBy.toString() !== user.id
    ) {
      throw new ForbiddenException();
    }

    await this.productCategoryModel
      .findByIdAndUpdate(id, updateProductCategoryDto)
      .exec();
    const result = await this.productCategoryModel.findById(id);
    return result;
  }

  async remove(user: UserRequest, id: string) {
    const productCategory = await this.productCategoryModel.findById(id);

    if (
      user.role !== Role.ADMIN &&
      productCategory.createdBy.toString() !== user.id
    ) {
      throw new ForbiddenException();
    }

    return this.productCategoryModel.findByIdAndDelete(id);
  }
}
