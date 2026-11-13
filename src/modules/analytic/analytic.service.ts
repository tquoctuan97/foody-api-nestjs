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
import { CustomerProductHabitsParams } from './models/customer-product-habits.params';
import { CustomerPurchaseReportParams } from './models/customer-purchase-report.params';
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

  private parseBillDateRange(from: string, to: string) {
    const billDateFrom = new Date(from);
    const billDateTo = new Date(to);
    if (isNaN(billDateFrom.getTime()) || isNaN(billDateTo.getTime())) {
      throw new BadRequestException('billDateFrom and billDateTo must be valid dates');
    }
    if (billDateFrom > billDateTo) {
      throw new BadRequestException(
        'billDateFrom cannot be greater than billDateTo',
      );
    }
    return { billDateFrom, billDateTo };
  }

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

  private async aggregateByProductForBills(
    billIds: Types.ObjectId[],
    sortBy: 'purchaseCount' | 'amountTotal' = 'purchaseCount',
  ) {
    if (!billIds.length) {
      return [];
    }

    return this.billModel
      .aggregate([
        { $match: { _id: { $in: billIds } } },
        { $unwind: '$billList' },
        {
          $match: {
            'billList.productId': { $exists: true, $ne: null },
          },
        },
        {
          $group: {
            _id: '$billList.productId',
            productName: { $first: '$billList.name' },
            purchaseCount: { $sum: 1 },
            amountTotal: { $sum: '$billList.total' },
          },
        },
        {
          $sort:
            sortBy === 'amountTotal'
              ? { amountTotal: -1, productName: 1 }
              : { purchaseCount: -1, productName: 1 },
        },
        {
          $project: {
            _id: 0,
            productId: { $toString: '$_id' },
            productName: 1,
            purchaseCount: 1,
            amountTotal: 1,
          },
        },
      ])
      .exec();
  }

  async getCustomerProductHabits(query: CustomerProductHabitsParams) {
    const billLimit = query.billLimit ?? 30;
    const customerId = new Types.ObjectId(query.customerId);

    const recentBills = await this.billModel
      .find({ customerId, deletedAt: null })
      .sort({ billDate: -1, createdAt: -1 })
      .limit(billLimit)
      .select('_id')
      .lean()
      .exec();

    const billIds = recentBills.map((bill) => bill._id as Types.ObjectId);
    const products = await this.aggregateByProductForBills(billIds);

    return {
      customerId: query.customerId,
      billsSampled: billIds.length,
      products,
    };
  }

  async getCustomerPurchaseReport(
    query: CustomerPurchaseReportParams,
    isDeleted?: boolean,
  ) {
    const { billDateFrom, billDateTo } = this.parseBillDateRange(
      query.billDateFrom,
      query.billDateTo,
    );

    const match: FilterQuery<Bill> = {
      customerId: new Types.ObjectId(query.customerId),
      billDate: { $gte: billDateFrom, $lte: billDateTo },
      ...softDeleteFilter(isDeleted),
    };

    const [facet] = await this.billModel
      .aggregate([
        { $match: match },
        {
          $facet: {
            summary: [
              {
                $group: {
                  _id: null,
                  billCount: { $sum: 1 },
                  sumTotal: { $sum: '$sum' },
                },
              },
              { $project: { _id: 0, billCount: 1, sumTotal: 1 } },
            ],
            sumByDate: [
              {
                $group: {
                  _id: '$billDate',
                  sum: { $sum: '$sum' },
                },
              },
              { $project: { _id: 0, date: '$_id', sum: 1 } },
              { $sort: { date: 1 } },
            ],
            minBill: [
              { $sort: { sum: 1, _id: 1 } },
              { $limit: 1 },
              {
                $project: {
                  _id: 0,
                  billId: { $toString: '$_id' },
                  sum: 1,
                  billDate: 1,
                },
              },
            ],
            maxBill: [
              { $sort: { sum: -1, _id: 1 } },
              { $limit: 1 },
              {
                $project: {
                  _id: 0,
                  billId: { $toString: '$_id' },
                  sum: 1,
                  billDate: 1,
                },
              },
            ],
            debtBill: [
              { $match: { finalResult: { $gt: 0 } } },
              { $sort: { billDate: -1, createdAt: -1 } },
              { $limit: 1 },
              {
                $project: {
                  _id: 0,
                  billId: { $toString: '$_id' },
                  finalResult: 1,
                  billDate: 1,
                },
              },
            ],
          },
        },
      ])
      .exec();

    const summary = facet?.summary?.[0];
    const billCount = summary?.billCount ?? 0;
    const sumTotal = summary?.sumTotal ?? 0;
    const avgSumPerBill = billCount > 0 ? sumTotal / billCount : 0;
    const minBill = facet?.minBill?.[0] ?? null;
    const maxBill = facet?.maxBill?.[0] ?? null;
    const sumByDate = facet?.sumByDate ?? [];
    const debtBill = facet?.debtBill?.[0] ?? null;
    const outstandingDebt = debtBill?.finalResult ?? 0;
    const netValue = sumTotal - outstandingDebt;

    const billsInRange = await this.billModel
      .find(match)
      .select('_id')
      .lean()
      .exec();
    const byProduct = await this.aggregateByProductForBills(
      billsInRange.map((b) => b._id as Types.ObjectId),
      'amountTotal',
    );

    return {
      customerId: query.customerId,
      billDateFrom: query.billDateFrom,
      billDateTo: query.billDateTo,
      billCount,
      sumTotal,
      avgSumPerBill,
      minBill,
      maxBill,
      sumByDate,
      outstandingDebt,
      netValue,
      debtBill,
      byProduct,
    };
  }
}
