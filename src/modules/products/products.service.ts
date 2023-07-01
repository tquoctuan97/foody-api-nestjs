import { Injectable } from '@nestjs/common';
import { Product } from 'src/models/product.model';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  private counterId = 3;
  private products: Product[] = [
    {
      id: '1',
      title: 'First Product',
      price: 10,
    },
    {
      id: '2',
      title: 'Second Product',
      price: 20,
    },
  ];

  getAll() {
    return this.products;
  }

  getOne(id: string) {
    return this.products.find((p) => p.id === id);
  }

  create(createProductDto: CreateProductDto) {
    const newProduct: Product = {
      id: String(this.counterId++),
      price: createProductDto.price,
      title: createProductDto.title,
    };
    this.products.push(newProduct);
    return newProduct;
  }

  update(id: string, updateProductDto: UpdateProductDto) {
    const findIndex = this.products.findIndex((p) => p.id === id);
    const updatedProduct: Product = {
      id: this.products[findIndex].id,
      price: updateProductDto.price,
      title: updateProductDto.title,
    };
    this.products[findIndex] = updatedProduct;
    return updatedProduct;
  }

  delete(id: string) {
    const newList = this.products.filter((p) => p.id !== id);
    this.products = newList;
    return this.products;
  }
}
