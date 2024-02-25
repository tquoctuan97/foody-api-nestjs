import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PaginationDto } from 'src/common/pagination/pagination.dto';
import { UserRequest } from '../auth/models/auth.model';
import { Role } from '../users/models/user.model';
import { CreateBillDto } from './dto/create-bill.dto';
import { UpdateBillDto } from './dto/update-bill.dto';
import { Bill } from './entities/bill.entity';
import { BillParams } from './models/bill.model';

@Injectable()
export class BillsService {
  constructor(
    @InjectModel(Bill.name) private readonly billModel: Model<Bill>,
  ) {}

  async getAll(query: BillParams) {
    const currentPage = parseInt(query?.page) || 1;
    const pageSize = parseInt(query?.pageSize) || 10;

    const queryBill = {
      customerName: new RegExp(query?.search || '', 'i'),
      deletedAt: null,
    };

    const totalCount = await this.billModel.countDocuments(queryBill);

    const data = await this.billModel
      .find(queryBill)
      .sort(query.sort || '-createdAt')
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize)
      .lean<Bill[]>()
      .exec();

    const response = new PaginationDto<Bill[]>(data, {
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

  async getOne(id: string) {
    return this.billModel.findById(id).exec();
  }

  async create(user: UserRequest, createBillDto: CreateBillDto) {
    const { billDate, billList, customerName, debt, finalResult, prePay, sum } =
      createBillDto;

    const newBill = new this.billModel({
      billDate,
      billList,
      customerName,
      debt,
      finalResult,
      prePay,
      sum,
      createdBy: user.id,
    });

    const result = await newBill.save();

    return result;
  }

  async update(user: UserRequest, id: string, updateBillDto: UpdateBillDto) {
    const bill = await this.billModel.findById(id);

    if (user.role !== Role.ADMIN && bill.createdBy.toString() !== user.id) {
      throw new ForbiddenException();
    }

    return this.billModel
      .findByIdAndUpdate(id, updateBillDto, { new: true })
      .exec();
  }

  async delete(user: UserRequest, id: string) {
    const bill = await this.billModel.findById(id);

    if (user.role !== Role.ADMIN && bill.createdBy.toString() !== user.id) {
      throw new ForbiddenException();
    }

    return this.billModel.findByIdAndUpdate(id, {
      deletedAt: new Date().toISOString(),
    });
  }
}
