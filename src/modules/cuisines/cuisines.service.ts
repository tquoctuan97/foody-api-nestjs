import { Injectable } from '@nestjs/common';
import { CreateCuisineDto } from './dto/create-cuisine.dto';
import { UpdateCuisineDto } from './dto/update-cuisine.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cuisine } from './entities/cuisine.entity';
import { PaginationParams } from 'src/common/pagination/pagination.model';
import { PaginationDto } from 'src/common/pagination/pagination.dto';

@Injectable()
export class CuisinesService {
  constructor(
    @InjectModel(Cuisine.name) private cuisineModel: Model<Cuisine>,
  ) {}

  async create(createCuisineDto: CreateCuisineDto): Promise<Cuisine> {
    const createdCuisine = await this.cuisineModel.create(createCuisineDto);
    return createdCuisine;
  }

  async findAll(query: PaginationParams): Promise<PaginationDto<Cuisine[]>> {
    const currentPage = parseInt(query.page) || 1;
    const pageSize = parseInt(query.pageSize) || 10;
    const totalCount = await this.cuisineModel.countDocuments();

    const data = await this.cuisineModel.find().lean<Cuisine[]>().exec();

    const response = new PaginationDto<Cuisine[]>(data, {
      pageSize: pageSize,
      currentPage: currentPage,
      // count total number of pages
      totalPages: pageSize === -1 ? 1 : Math.ceil(totalCount / pageSize),
      // count total number of stores in database
      totalCount: totalCount,
      // check if there is next page
      hasNextPage: currentPage < Math.ceil(totalCount / pageSize),
    });

    return response;
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
