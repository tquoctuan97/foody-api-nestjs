import { Injectable } from '@nestjs/common';
import { Product } from 'src/modules/products/product.model';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel('Product') private readonly productModel: Model<Product>,
  ) {}

  getAll() {
    return this.productModel.find();
  }

  getOne(id: string) {
    return this.productModel.findById(id);
  }

  async create(createProductDto: CreateProductDto) {
    const newProduct = new this.productModel({
      title: createProductDto.title.trim(),
      price: createProductDto.price,
    });
    const result = await newProduct.save();
    return result._id;
  }

  update(id: string, updateProductDto: UpdateProductDto) {
    return this.productModel.findByIdAndUpdate(id, {
      title: updateProductDto.title.trim(),
      price: updateProductDto.price,
    });
  }

  delete(id: string) {
    return this.productModel.findByIdAndDelete(id);
  }
}
