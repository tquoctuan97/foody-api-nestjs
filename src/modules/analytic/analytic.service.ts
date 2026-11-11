import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import {
  buildPaginatedResult,
  parsePagination,
  softDeleteFilter,
} from 'src/common/pagination/paginate';
import { Bill } from '../bills/entities/bill.entity';
import { billDetailPopulateOptions } from '../bills/bill-populate';
import { UnlinkedBillItemsParams } from './models/unlinked-bill-items.params';
import { UnlinkedBillsParams } from './models/unlinked-bills.params';

function unlinkedCustomerFilter(): FilterQuery<Bill> {
  return {
    $or: [{ customerId: null }, { customerId: { $exists: false } }],
  };
}

function unlinkedProductIdClause() {
  return {
    $or: [{ productId: null }, { productId: { $exists: false } }],
  };
}

function billsWithUnlinkedProductLinesFilter(
  searchRegex?: RegExp,
): FilterQuery<Bill> {
  return {
    billList: {
      $elemMatch: {
        ...unlinkedProductIdClause(),
        ...(searchRegex && { name: searchRegex }),
      },
    },
  };
}

@Injectable()
export class AnalyticService {
  constructor(
    @InjectModel(Bill.name) private readonly billModel: Model<Bill>,
  ) {}

  async getUnlinkedBills(query: UnlinkedBillsParams, isDeleted?: boolean) {
    const exactName = query.customerName?.trim();
    const match: FilterQuery<Bill> = {
      ...unlinkedCustomerFilter(),
      ...softDeleteFilter(isDeleted),
      ...(exactName
        ? { customerName: exactName }
        : query.search?.trim() && {
            customerName: new RegExp(query.search.trim(), 'i'),
          }),
    };

    if (query.groupBy === 'customerName') {
      if (exactName) {
        throw new BadRequestException(
          'Do not use groupBy with customerName; omit groupBy for bill detail',
        );
      }
      return this.billModel
        .aggregate([
          { $match: match },
          {
            $group: {
              _id: '$customerName',
              customerName: { $first: '$customerName' },
              billCount: { $sum: 1 },
              totalFinalResult: { $sum: '$finalResult' },
            },
          },
          {
            $project: {
              _id: 0,
              customerName: 1,
              billCount: 1,
              totalFinalResult: 1,
            },
          },
          { $sort: { billCount: -1, customerName: 1 } },
        ])
        .exec();
    }

    const { currentPage, pageSize } = parsePagination(query);
    const totalCount = await this.billModel.countDocuments(match);

    const data = await this.billModel
      .find(match)
      .sort(query.sort || '-billDate')
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize)
      .populate(billDetailPopulateOptions())
      .exec();

    return buildPaginatedResult(data, totalCount, currentPage, pageSize);
  }

  async getUnlinkedBillItems(
    query: UnlinkedBillItemsParams,
    isDeleted?: boolean,
  ) {
    const searchRegex = query.search?.trim()
      ? new RegExp(query.search.trim(), 'i')
      : undefined;

    const match: FilterQuery<Bill> = {
      ...softDeleteFilter(isDeleted),
      ...billsWithUnlinkedProductLinesFilter(searchRegex),
    };

    const { currentPage, pageSize } = parsePagination(query);
    const totalCount = await this.billModel.countDocuments(match);

    const data = await this.billModel
      .find(match)
      .sort(query.sort || '-billDate')
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize)
      .populate(billDetailPopulateOptions())
      .exec();

    return buildPaginatedResult(data, totalCount, currentPage, pageSize);
  }

  async getBillsByRange(
    from: string,
    to: string,
    groupBy: 'date' | 'customer' = 'date',
    customerName?: string,
    customerId?: string,
    isDeleted?: boolean,
  ): Promise<unknown[]> {
    const matchStage: FilterQuery<Bill> = {
      billDate: { $gte: new Date(from), $lte: new Date(to) },
      ...softDeleteFilter(isDeleted),
      ...(customerId && { customerId: new Types.ObjectId(customerId) }),
      ...(customerName && {
        customerName: new RegExp(customerName, 'i'),
      }),
    };

    if (groupBy === 'customer') {
      return this.billModel
        .aggregate([
          { $match: matchStage },
          { $unwind: '$billList' },
          {
            $group: {
              _id: '$customerId',
              customerName: { $first: '$customerName' },
              totalSpent: {
                $sum: { $multiply: ['$billList.quantity', '$billList.price'] },
              },
              billCount: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              customerName: '$customerName',
              customerId: '$_id',
              totalSpent: 1,
              billCount: 1,
            },
          },
        ])
        .exec();
    }

    return this.billModel
      .aggregate([
        { $match: matchStage },
        { $unwind: '$billList' },
        {
          $group: {
            _id: '$billDate',
            totalSpent: {
              $sum: { $multiply: ['$billList.quantity', '$billList.price'] },
            },
          },
        },
        {
          $project: {
            _id: 0,
            name: '$_id',
            totalSpent: 1,
          },
        },
        { $sort: { name: -1 } },
      ])
      .exec();
  }
}
