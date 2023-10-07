import { ForbiddenException, Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product } from './entities/product.entity';
import { ProductCategoryParams } from './models/product.model';
import { PaginationDto } from 'src/common/pagination/pagination.dto';
import { UserRequest } from '../auth/models/auth.model';
import { Role } from '../users/models/user.model';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
  ) {}

  async getAll(query: ProductCategoryParams) {
    const currentPage = parseInt(query?.page) || 1;
    const pageSize = parseInt(query?.pageSize) || 10;

    const queryStore = {
      name: new RegExp(query?.search || '', 'i'),
      status: new RegExp(query?.status || '', 'i'),
      store: new Types.ObjectId(query.storeId),
    };

    const totalCount = await this.productModel.countDocuments(queryStore);

    const data = await this.productModel
      .find(queryStore)
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize)
      .sort(query.sort || '-createdAt')
      .populate({
        path: 'category',
        transform: (category) => ({
          _id: category._id,
          name: category.name,
        }),
      })
      .populate({
        path: 'store',
        transform: (category) => ({
          _id: category._id,
          name: category.name,
        }),
      })
      .populate({
        path: 'createdBy',
        transform: (user) => ({
          _id: user._id,
          name: user.name,
        }),
      })
      .lean<Product[]>()
      .exec();

    const response = new PaginationDto<Product[]>(data, {
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

  async create(user: UserRequest, createProductDto: CreateProductDto) {
    const { name, price, categoryId, description, imageUrl, status, storeId } =
      createProductDto;

    const newProduct = new this.productModel({
      name: name.trim(),
      description: description.trim(),
      price,
      imageUrl,
      status,
      category: new Types.ObjectId(categoryId),
      store: new Types.ObjectId(storeId),
      createdBy: new Types.ObjectId(user.id),
    });

    const result = await newProduct.save();

    return result;
  }

  async update(
    user: UserRequest,
    id: string,
    updateProductDto: UpdateProductDto,
  ) {
    const productCategory = await this.productModel.findById(id);

    if (
      user.role !== Role.ADMIN &&
      productCategory.createdBy.toString() !== user.id
    ) {
      throw new ForbiddenException();
    }

    return this.productModel.findByIdAndUpdate(id, {
      title: updateProductDto.name.trim(),
      price: updateProductDto.price,
    });
  }

  async delete(user: UserRequest, id: string) {
    const productCategory = await this.productModel.findById(id);

    if (
      user.role !== Role.ADMIN &&
      productCategory.createdBy.toString() !== user.id
    ) {
      throw new ForbiddenException();
    }

    return this.productModel.findByIdAndDelete(id);
  }
}
