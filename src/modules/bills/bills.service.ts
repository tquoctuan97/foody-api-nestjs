import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { PaginationDto } from 'src/common/pagination/pagination.dto';
import { UserRequest } from '../auth/models/auth.model';
import { Role } from '../users/models/user.model';
import { CreateBillDto } from './dto/create-bill.dto';
import { UpdateBillDto } from './dto/update-bill.dto';
import { Bill } from './entities/bill.entity';
import { BillParams } from './models/bill.model';
import { User } from '../users/entities/user.entity';

@Injectable()
export class BillsService {
  constructor(
    @InjectModel(Bill.name) private readonly billModel: Model<Bill>,
  ) {}

  private validateAndParseDates(query: BillParams): {
    billDate?: string;
    billDateFrom?: string;
    billDateTo?: string;
  } {
    const dates: Pick<BillParams, 'billDate' | 'billDateFrom' | 'billDateTo'> =
      ['billDate', 'billDateFrom', 'billDateTo'].reduce((acc, key) => {
        if (query[key]) {
          const date = new Date(query[key]);
          if (isNaN(date.getTime())) {
            throw new BadRequestException(`${key} must be a valid date`);
          }
          acc[key] = date;
        }
        return acc;
      }, {});

    if (
      dates.billDateFrom &&
      dates.billDateTo &&
      dates.billDateFrom > dates.billDateTo
    ) {
      throw new BadRequestException(
        'billDateFrom cannot be greater than billDateTo',
      );
    }

    if ((dates.billDateFrom || dates.billDateTo) && dates.billDate) {
      throw new BadRequestException(
        'billDate cannot be used with billDateFrom or billDateTo',
      );
    }

    return dates;
  }

  async getAll(query: BillParams) {
    const currentPage = parseInt(query?.page) || 1;
    const pageSize = parseInt(query?.pageSize) || 10;

    const { billDate, billDateFrom, billDateTo } =
      this.validateAndParseDates(query);

    const queryBill: FilterQuery<Bill> = {
      customerName: new RegExp(query?.search || '', 'i'),
      ...(query?.customerId && {
        customerId: new Types.ObjectId(query.customerId),
      }),
      ...(billDate && { billDate }),
      ...(billDateFrom && { billDate: { $gte: billDateFrom } }),
      ...(billDateTo && { billDate: { $lte: billDateTo } }),
      ...(billDateFrom &&
        billDateTo && { billDate: { $gte: billDateFrom, $lte: billDateTo } }),
      ...(query?.isDeleted
        ? { deletedAt: { $ne: null } }
        : { deletedAt: null }),
    };

    const totalCount = await this.billModel.countDocuments(queryBill);

    const data = await this.billModel
      .find(queryBill)
      .sort(query?.sort || '-createdAt')
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize)
      .populate([
        {
          path: 'customerId',
          transform: (customer) => ({
            _id: customer._id,
            name: customer.name,
            displayName: customer.displayName,
            phoneNumber: customer.phoneNumber,
          }),
        },
        ...['createdBy', 'updatedBy', 'deletedBy'].map((path) => ({
          path,
          transform: (user: User) => ({
            _id: user._id,
            name: user.name,
          }),
        })),
      ])
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
    const bill = await this.billModel.findById(id).exec();

    if (!bill) {
      throw new NotFoundException(`Bill ${id} is not found`);
    }

    return bill.populate([
      {
        path: 'customerId',
        transform: (customer) => ({
          _id: customer._id,
          name: customer.name,
          displayName: customer.displayName,
          phoneNumber: customer.phoneNumber,
        }),
      },
      {
        path: 'createdBy',
        transform: (user) => ({
          _id: user._id,
          name: user.name,
        }),
      },
      {
        path: 'updatedBy',
        transform: (user) => ({
          _id: user._id,
          name: user.name,
        }),
      },
      {
        path: 'deletedBy',
        transform: (user) => ({
          _id: user._id,
          name: user.name,
        }),
      },
    ]);
  }

  async create(user: UserRequest, createBillDto: CreateBillDto) {
    const {
      billDate,
      billList,
      customerName,
      customerId,
      debt,
      finalResult,
      prePay,
      sum,
      adjustmentList,
    } = createBillDto;

    const newBill = new this.billModel({
      billDate,
      billList,
      customerName,
      customerId: new Types.ObjectId(customerId),
      debt,
      finalResult,
      prePay,
      sum,
      adjustmentList,
      createdBy: new Types.ObjectId(user.id),
    });

    await newBill.save();

    return newBill.populate([
      {
        path: 'customerId',
        transform: (customer) => ({
          _id: customer._id,
          name: customer.name,
          displayName: customer.displayName,
          phoneNumber: customer.phoneNumber,
        }),
      },
      ...['createdBy', 'updatedBy', 'deletedBy'].map((path) => ({
        path,
        transform: (user: User) => ({
          _id: user._id,
          name: user.name,
        }),
      })),
    ]);
  }

  async update(user: UserRequest, id: string, updateBillDto: UpdateBillDto) {
    const bill = await this.getOne(id);

    if (user.role !== Role.ADMIN && bill.createdBy.toString() !== user.id) {
      throw new ForbiddenException(
        'You do not have permission to update this bill',
      );
    }

    if (bill.deletedAt) {
      throw new ForbiddenException("Can't update deleted bill");
    }

    await bill
      .set({ ...updateBillDto, updatedBy: new Types.ObjectId(user.id) })
      .save();

    return bill.populate([
      {
        path: 'customerId',
        transform: (customer) => ({
          _id: customer._id,
          name: customer.name,
          displayName: customer.displayName,
          phoneNumber: customer.phoneNumber,
        }),
      },
      {
        path: 'updatedBy',
        transform: (user) => ({
          _id: user._id,
          name: user.name,
        }),
      },
    ]);
  }

  async delete(user: UserRequest, id: string) {
    const bill = await this.getOne(id);

    if (user.role !== Role.ADMIN && bill.createdBy.toString() !== user.id) {
      throw new ForbiddenException(
        'You do not have permission to delete this bill',
      );
    }

    await bill
      .set({
        deletedAt: new Date().toISOString(),
        deletedBy: new Types.ObjectId(user.id),
      })
      .save();

    return bill.populate({
      path: 'deletedBy',
      transform: (user) => ({
        _id: user._id,
        name: user.name,
      }),
    });
  }

  async getLatestBill(customerId: string): Promise<Bill | { message: string }> {
    const latestBill = await this.billModel
      .find({
        customerId: new Types.ObjectId(customerId),
        deletedAt: null,
      })
      .sort('-createdAt')
      .limit(1)
      .lean() // Use lean for better performance if we don't need a full Mongoose document
      .exec();

    return latestBill[0] || null;
  }
}
