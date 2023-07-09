import { Injectable } from '@nestjs/common';
import { CreateCuisineDto } from './dto/create-cuisine.dto';
import { UpdateCuisineDto } from './dto/update-cuisine.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cuisine } from './entities/cuisine.entity';

@Injectable()
export class CuisinesService {
  constructor(
    @InjectModel(Cuisine.name) private cuisineModel: Model<Cuisine>,
  ) {}

  async create(createCuisineDto: CreateCuisineDto): Promise<Cuisine> {
    const createdCuisine = await this.cuisineModel.create(createCuisineDto);
    return createdCuisine;
  }

  findAll(): Promise<Cuisine[]> {
    return this.cuisineModel.find().exec();
  }

  async findOne(id: string): Promise<Cuisine> {
    return this.cuisineModel.findOne({ _id: id }).exec();
  }

  async update(
    id: string,
    updateCuisineDto: UpdateCuisineDto,
  ): Promise<Cuisine> {
    const updatedCuisine = await this.cuisineModel
      .findByIdAndUpdate({ _id: id }, updateCuisineDto, { new: true })
      .exec();
    return updatedCuisine;
  }

  async remove(id: string) {
    const deletedCuisine = await this.cuisineModel
      .findByIdAndRemove({ _id: id })
      .exec();
    return deletedCuisine;
  }
}
