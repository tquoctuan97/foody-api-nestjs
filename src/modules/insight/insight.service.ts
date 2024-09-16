import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Bill } from '../bills/entities/bill.entity';
import { Customer } from '../customers/entities/customer.entity';

@Injectable()
export class InsightService {
  constructor(
    @InjectModel(Bill.name) private billModel: Model<Bill>,
    @InjectModel(Customer.name) private customerModel: Model<Customer>,
  ) {}
  async getTopItemsByMonth(
    fromDate: Date,
    toDate: Date,
    sortBy: 'quantity' | 'revenue' = 'quantity',
    groupBy: 'day' | 'week' | 'month' | 'quarter' | 'year' = 'month',
    top?: number,
  ) {
    const sortField = sortBy === 'quantity' ? 'totalQuantity' : 'totalRevenue';

    const groupFields: any = {
      day: { $dayOfMonth: '$billDate' },
      month: { $month: '$billDate' },
      year: { $year: '$billDate' },
    };
    const groupAt: any = {
      day: '$_id.day',
      month: '$_id.month',
      year: '$_id.year',
    };

    switch (groupBy) {
      case 'week':
        groupFields.week = { $isoWeek: '$billDate' };
        groupAt.week = '$_id.week';
        delete groupAt.day;
        delete groupFields.day;
        break;
      case 'month':
        delete groupAt.day;
        delete groupFields.day;
        break;
      case 'quarter':
        groupFields.quarter = {
          $ceil: { $divide: [{ $month: '$billDate' }, 3] },
        };
        delete groupFields.day;
        delete groupAt.day;
        delete groupFields.month;
        delete groupAt.month;
        groupAt.quarter = '$_id.quarter';
        break;
      case 'year':
        delete groupFields.day;
        delete groupFields.month;
        delete groupAt.day;
        delete groupAt.month;
        break;
      default:
        break;
    }

    const pipeline: any[] = [
      {
        $match: { billDate: { $gte: fromDate, $lte: toDate }, deletedAt: null },
      },
      { $unwind: '$billList' },
      {
        $group: {
          _id: {
            itemName: '$billList.name',
            ...groupFields,
          },
          totalQuantity: { $sum: '$billList.quantity' },
          totalRevenue: { $sum: '$billList.total' },
        },
      },
      {
        $sort: { [sortField]: -1 },
      },
      {
        $group: {
          _id: { ...groupAt },
          items: {
            $push: {
              itemName: '$_id.itemName',
              totalQuantity: '$totalQuantity',
              totalRevenue: '$totalRevenue',
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          ...(groupBy === 'week' && { week: '$_id.week' }),
          ...(groupBy === 'quarter' && { quarter: '$_id.quarter' }),
          ...(groupBy !== 'year' && { month: '$_id.month' }),
          ...(groupBy === 'day' && { day: '$_id.day' }),
          year: '$_id.year',
          items: top ? { $slice: ['$items', Number(top)] } : '$items',
        },
      },
      {
        $sort:
          groupBy === 'week'
            ? { year: -1, week: -1 }
            : groupBy === 'quarter'
            ? { year: -1, quarter: -1 }
            : groupBy === 'month'
            ? { year: -1, month: -1 }
            : { year: -1, month: -1, day: -1 },
      },
    ];

    return this.billModel.aggregate(pipeline).exec();
  }

  async getTopItems(
    from: Date,
    to: Date,
    sortBy: 'quantity' | 'revenue' = 'quantity',
    top?: number,
  ): Promise<any[]> {
    const sortField = sortBy === 'quantity' ? 'totalQuantity' : 'totalRevenue';
    return this.billModel
      .aggregate([
        {
          $match: {
            billDate: { $gt: from, $lt: to },
            deletedAt: null,
          },
        }, // Lọc theo khoảng thời gian
        { $unwind: '$billList' }, // Phân rã billList để tính từng món
        {
          $group: {
            _id: '$billList.name', // Nhóm theo tên món hàng
            totalBills: { $sum: 1 },
            totalQuantity: { $sum: '$billList.quantity' }, // Tổng số lượng món hàng
            totalRevenue: {
              $sum: { $multiply: ['$billList.quantity', '$billList.price'] },
            }, // Tính doanh thu
          },
        },
        {
          $sort: {
            [sortField]: -1,
          },
        },
        {
          $project: {
            _id: 0, // Remove the _id field from the result
            name: '$_id', // Rename _id to name
            totalQuantity: '$totalQuantity',
            totalRevenue: '$totalRevenue',
            totalBills: '$totalBills',
          },
        },
        {
          $limit: Number(top) || Number.MAX_SAFE_INTEGER, // Apply the top limit if provided
        },
      ])
      .exec();
  }

  async getCustomerOverview(
    customerId: string,
    from?: Date,
    to?: Date,
  ): Promise<any> {
    const matchStage: any = {
      customerId: new Types.ObjectId(customerId),
      deletedAt: null,
      ...(from && to && { billDate: { $gte: from, $lte: to } }), // Filter by date if from and to are provided
    };

    const customerBills = await this.billModel
      .aggregate([
        {
          $match: matchStage, // Apply date range filter here
        },
        { $unwind: '$billList' }, // Handle each billList item
        {
          $group: {
            _id: '$customerId',
            billCount: { $sum: 1 },
            totalSpent: {
              $sum: { $multiply: ['$billList.quantity', '$billList.price'] },
            },
          },
        },
      ])
      .exec();

    const customerPaid = await this.billModel
      .aggregate([
        {
          $match: matchStage, // Apply the same date range filter here
        },
        { $unwind: '$adjustmentList' },
        {
          $match: {
            'adjustmentList.name': 'Gởi',
            'adjustmentList.type': 'subtract',
          },
        },
        {
          $group: {
            _id: '$customerId',
            totalPaid: { $sum: '$adjustmentList.amount' },
          },
        },
      ])
      .exec();

    // Find the latest bill within the date range if applicable
    const latestBill = await this.billModel
      .findOne(matchStage)
      .sort({ billDate: -1, createdAt: -1 })
      .exec();

    const totalDebt = latestBill?.finalResult || 0;
    const totalPaid = customerPaid[0]?.totalPaid || 0;
    const totalSpent = customerBills[0]?.totalSpent || 0;
    const billCount = customerBills[0]?.billCount || 0;
    const totalResult = totalSpent - totalPaid;

    return {
      billCount,
      totalDebt,
      totalSpent,
      totalPaid,
      totalResult,
    };
  }

  async getCustomerOverviewByMonth(
    customerId: string,
    from?: Date,
    to?: Date,
  ): Promise<any> {
    const matchStage: any = {
      customerId: new Types.ObjectId(customerId),
      deletedAt: null,
      ...(from && to && { billDate: { $gte: from, $lte: to } }), // Filter by date if from and to are provided
    };

    const monthlyOverview = await this.billModel
      .aggregate([
        {
          $match: matchStage, // Apply date range filter here
        },
        { $unwind: '$billList' },
        {
          $group: {
            _id: {
              day: { $dayOfMonth: '$billDate' },
              month: { $month: '$billDate' },
              year: { $year: '$billDate' },
            },
            billCount: { $sum: 1 },
            totalSpent: {
              $sum: { $multiply: ['$billList.quantity', '$billList.price'] },
            },
            latestBill: { $last: '$$ROOT' }, // Get the latest bill for each month
          },
        },
        {
          $lookup: {
            from: 'bills',
            localField: 'latestBill._id',
            foreignField: '_id',
            as: 'latestBillDetails',
          },
        },
        {
          $unwind: '$latestBillDetails',
        },
        {
          $addFields: {
            totalDebt: '$latestBillDetails.finalResult', // Use the finalResult of the latest bill as debt
          },
        },
        {
          $lookup: {
            from: 'bills',
            let: {
              customerId: '$customerId',
              billDate: '$latestBillDetails.billDate',
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$customerId', '$$customerId'] },
                      { $lte: ['$billDate', '$$billDate'] },
                    ],
                  },
                },
              },
              { $unwind: '$adjustmentList' },
              {
                $match: {
                  'adjustmentList.name': 'Gởi',
                  'adjustmentList.type': 'subtract',
                },
              },
              {
                $group: {
                  _id: null,
                  totalPaid: { $sum: '$adjustmentList.amount' },
                },
              },
            ],
            as: 'totalPaidDetails',
          },
        },
        {
          $addFields: {
            totalPaid: {
              $ifNull: [
                { $arrayElemAt: ['$totalPaidDetails.totalPaid', 0] },
                0,
              ],
            },
            totalResult: {
              $subtract: [
                '$totalSpent',
                {
                  $ifNull: [
                    { $arrayElemAt: ['$totalPaidDetails.totalPaid', 0] },
                    0,
                  ],
                },
              ],
            },
          },
        },
        {
          $project: {
            _id: 0,
            day: '$_id.day',
            month: '$_id.month',
            year: '$_id.year',
            billCount: 1,
            totalSpent: 1,
            totalDebt: 1,
            totalPaid: 1,
            totalResult: 1,
          },
        },
        {
          $sort: { year: 1, month: 1, day: 1 },
        },
      ])
      .exec();

    return monthlyOverview;
  }

  async getCustomerOverviewProduct(
    customerId: string,
    from?: string,
    to?: string,
  ) {
    const fromDate = new Date(from);
    const toDate = new Date(to);

    // Lọc theo khoảng thời gian nếu có
    const matchStage: any = {
      customerId: new Types.ObjectId(customerId),
      deletedAt: null,
      ...(!!from && !!to && { billDate: { $gte: fromDate, $lte: toDate } }),
    };

    // Lấy tổng số lượng sản phẩm mà khách hàng đã mua
    const totalQuantity = await this.billModel
      .aggregate([
        { $match: matchStage },
        { $unwind: '$billList' },
        {
          $group: {
            _id: null,
            totalQuantity: { $sum: '$billList.quantity' },
          },
        },
      ])
      .exec();

    // Chi tiêu trung bình trên mỗi hóa đơn
    const averageSpending = await this.billModel
      .aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            averageSpending: { $avg: '$finalResult' },
          },
        },
      ])
      .exec();

    // Khoảng cách trung bình giữa mỗi đơn hàng
    const dateIntervals = await this.billModel
      .aggregate([
        { $match: matchStage },
        { $sort: { billDate: 1 } },
        {
          $group: {
            _id: null,
            dates: { $push: '$billDate' },
          },
        },
        {
          $project: {
            intervals: {
              $map: {
                input: { $range: [1, { $size: '$dates' }] },
                as: 'i',
                in: {
                  $subtract: [
                    { $arrayElemAt: ['$dates', '$$i'] },
                    { $arrayElemAt: ['$dates', { $subtract: ['$$i', 1] }] },
                  ],
                },
              },
            },
          },
        },
        {
          $project: {
            averageInterval: {
              $avg: '$intervals',
            },
          },
        },
      ])
      .exec();

    // Xếp hạng sản phẩm mua nhiều nhất
    const productRanking = await this.billModel
      .aggregate([
        { $match: matchStage },
        { $unwind: '$billList' },
        {
          $group: {
            _id: '$billList.name',
            totalQuantity: { $sum: '$billList.quantity' },
          },
        },
        { $sort: { totalQuantity: -1 } },
      ])
      .exec();

    // Tần suất mua hàng của khách hàng
    const purchaseFrequency = await this.billModel
      .aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            purchaseCount: { $count: {} },
          },
        },
      ])
      .exec();

    return {
      totalQuantity: totalQuantity[0]?.totalQuantity || 0,
      averageSpending: averageSpending[0]?.averageSpending || 0,
      averageInterval: dateIntervals[0]?.averageInterval || 0,
      productRanking,
      purchaseFrequency: purchaseFrequency[0]?.purchaseCount || 0,
    };
  }

  async getBillsWithItem(itemName: string) {
    return this.billModel
      .aggregate([
        { $match: { 'billList.name': itemName, deletedAt: null } }, // Lọc theo tên món hàng và đảm bảo chưa bị xóa
        {
          $unwind: '$billList', // Phân rã mảng billList
        },
        {
          $match: { 'billList.name': itemName }, // Lọc lại theo tên món hàng
        },
      ])
      .exec();
  }

  // 3. Tổng hợp doanh thu theo khoảng thời gian để vẽ biểu đồ (bar chart)
  async getRevenueForBarChart(from: Date, to: Date): Promise<any[]> {
    return this.billModel
      .aggregate([
        { $match: { billDate: { $gte: from, $lte: to }, deletedAt: null } }, // Lọc theo khoảng thời gian
        { $unwind: '$billList' }, // Phân rã billList để tính từng món
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$billDate' } }, // Nhóm theo ngày
            totalRevenue: {
              $sum: { $multiply: ['$billList.quantity', '$billList.price'] },
            }, // Tổng doanh thu
          },
        },
        { $sort: { _id: 1 } }, // Sắp xếp theo ngày tăng dần
      ])
      .exec();
  }

  // FINACE
  async getTopCustomer(
    from: Date,
    to: Date,
    sortBy: 'debt' | 'spent' | 'paid' = 'spent',
    top?: number,
  ): Promise<any[]> {
    const sortField =
      sortBy === 'debt'
        ? 'totalDebt'
        : sortBy === 'paid'
        ? 'totalPaid'
        : 'totalSpent';

    return this.billModel
      .aggregate([
        {
          $match: {
            billDate: { $gte: from, $lte: to },
            deletedAt: null,
          },
        },
        {
          $sort: { billDate: -1, createdAt: -1 }, // Sắp xếp để lấy bill mới nhất
        },
        { $unwind: '$billList' },
        {
          $group: {
            _id: '$customerId', // Nhóm theo customerId
            billCount: { $sum: 1 },
            latestBill: { $first: '$$ROOT' }, // Lấy bill mới nhất của mỗi customer
            totalSpent: {
              $sum: { $multiply: ['$billList.quantity', '$billList.price'] },
            }, // Tổng chi tiêu
          },
        },
        {
          $lookup: {
            from: 'customers', // Join với bảng customer để lấy thông tin khách hàng
            localField: '_id',
            foreignField: '_id',
            as: 'customer',
          },
        },
        { $unwind: '$customer' },
        {
          $lookup: {
            from: 'bills',
            let: { customerId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$customerId', '$$customerId'] },
                  deletedAt: null,
                },
              },
              { $unwind: '$adjustmentList' },
              {
                $match: {
                  'adjustmentList.name': 'Gởi',
                  'adjustmentList.type': 'subtract',
                  'adjustmentList.amount': { $gt: 0 },
                },
              },
              {
                $group: {
                  _id: '$customerId',
                  totalPaid: { $sum: '$adjustmentList.amount' }, // Tổng trả từ adjustmentList
                  paidList: {
                    $push: {
                      _id: '$_id', // Bill ID
                      billDate: '$billDate', // Ngày của hóa đơn
                      amount: '$adjustmentList.amount', // Số tiền của điều chỉnh 'Gởi'
                    },
                  },
                },
              },
            ],
            as: 'paidInfo',
          },
        },
        {
          $addFields: {
            totalPaid: {
              $ifNull: [{ $arrayElemAt: ['$paidInfo.totalPaid', 0] }, 0],
            },
            paidList: {
              $ifNull: [{ $arrayElemAt: ['$paidInfo.paidList', 0] }, []],
            },
            totalDebt: '$latestBill.finalResult', // Lấy finalResult của bill mới nhất làm totalDebt
          },
        },
        {
          $addFields: {
            totalResult: { $subtract: ['$totalSpent', '$totalPaid'] }, // Tính toán totalResult = totalSpent - totalPaid
          },
        },
        {
          $project: {
            _id: 0,
            customerId: '$_id',
            customerName: '$customer.name',
            totalSpent: 1,
            totalPaid: 1,
            totalResult: 1,
            totalDebt: 1, // Lấy từ latestBill.finalResult
            paidList: 1, // Thêm danh sách trả về theo cấu trúc yêu cầu
            billCount: 1,
          },
        },
        {
          $sort: { [sortField]: -1 }, // Sắp xếp theo debt hoặc spent giảm dần
        },
        {
          $limit: Number(top) || Number.MAX_SAFE_INTEGER, // Áp dụng giới hạn top nếu có
        },
      ])
      .exec();
  }

  async financeOverview(from: Date, to: Date): Promise<any> {
    const matchStage: any = {
      deletedAt: null,
      billDate: { $gte: from, $lte: to },
    };

    // Total Paid (sum of adjustmentList items with name "Gởi" and type "subtract")
    const totalPaid = await this.billModel
      .aggregate([
        { $match: matchStage },
        { $unwind: '$adjustmentList' },
        {
          $match: {
            'adjustmentList.name': 'Gởi',
            'adjustmentList.type': 'subtract',
          },
        },
        {
          $group: {
            _id: null,
            totalPaid: { $sum: '$adjustmentList.amount' },
          },
        },
      ])
      .exec();

    // Total Spent (sum of quantity * price for all bill items)
    const totalSpent = await this.billModel
      .aggregate([
        { $match: matchStage },
        { $unwind: '$billList' },
        {
          $group: {
            _id: null,
            totalSpent: {
              $sum: { $multiply: ['$billList.quantity', '$billList.price'] },
            },
          },
        },
      ])
      .exec();

    // Total Debt (sum of finalResult of the latest bill for each customer)
    const totalDebt = await this.billModel
      .aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$customerId',
            latestBillDate: { $max: '$billDate' },
            finalResult: { $last: '$finalResult' },
          },
        },
        {
          $group: {
            _id: null,
            totalDebt: { $sum: '$finalResult' },
          },
        },
      ])
      .exec();

    return {
      totalPaid: totalPaid[0]?.totalPaid || 0,
      totalSpent: totalSpent[0]?.totalSpent || 0,
      totalDebt: totalDebt[0]?.totalDebt || 0,
    };
  }
  async financeOverviewByMonth(from: Date, to: Date): Promise<any[]> {
    return this.billModel
      .aggregate([
        {
          $match: {
            billDate: { $gte: from, $lte: to },
            deletedAt: null,
          },
        },
        { $unwind: '$billList' },
        {
          $group: {
            _id: {
              month: { $month: '$billDate' },
              year: { $year: '$billDate' },
              customerId: '$customerId',
            },
            totalSpent: {
              $sum: { $multiply: ['$billList.quantity', '$billList.price'] },
            },
            finalResult: { $last: '$finalResult' },
          },
        },
        {
          $group: {
            _id: { month: '$_id.month', year: '$_id.year' },
            totalSpent: { $sum: '$totalSpent' },
            totalDebt: { $sum: '$finalResult' },
          },
        },
        {
          $lookup: {
            from: 'bills',
            let: { month: '$_id.month', year: '$_id.year' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: [{ $month: '$billDate' }, '$$month'] },
                      { $eq: [{ $year: '$billDate' }, '$$year'] },
                      { $eq: ['$deletedAt', null] },
                    ],
                  },
                },
              },
              { $unwind: '$adjustmentList' },
              {
                $match: {
                  'adjustmentList.name': 'Gởi',
                  'adjustmentList.type': 'subtract',
                },
              },
              {
                $group: {
                  _id: null,
                  totalPaid: { $sum: '$adjustmentList.amount' },
                },
              },
            ],
            as: 'paidInfo',
          },
        },
        {
          $addFields: {
            totalPaid: {
              $ifNull: [{ $arrayElemAt: ['$paidInfo.totalPaid', 0] }, 0],
            },
          },
        },
        {
          $project: {
            _id: 0,
            month: '$_id.month',
            year: '$_id.year',
            totalSpent: 1,
            totalPaid: 1,
            totalDebt: { $subtract: ['$totalSpent', '$totalPaid'] },
            actualDebt: '$totalDebt',
            actualPaid: { $subtract: ['$totalSpent', '$totalDebt'] },
          },
        },
        { $sort: { year: 1, month: 1 } }, // Sort by year and month ascending
      ])
      .exec();
  }

  async getTest() {
    // Lấy tất cả các khách hàng
    const customers = await this.customerModel.find().exec();

    const allCustomerResults = [];

    // Duyệt qua từng khách hàng
    for (const customer of customers) {
      const customerId = customer._id;

      // Lấy tất cả các hóa đơn của khách hàng, sắp xếp theo billDate từ cũ đến mới
      const bills = await this.billModel
        .find({ customerId: new Types.ObjectId(customerId), deletedAt: null })
        .sort({ billDate: 1 }) // Sắp xếp theo ngày tăng dần
        .exec();

      const customerResult = [];

      // Duyệt qua từng hóa đơn để tính toán sự chênh lệch
      for (let i = 1; i < bills.length; i++) {
        const currentBill = bills[i];
        const previousBill = bills[i - 1];

        // Tìm giá trị Toa cũ trong adjustmentList của hóa đơn hiện tại
        const currentToaCu =
          currentBill.adjustmentList.find(
            (adj) => adj.name === 'Toa cũ' && adj.type === 'add',
          )?.amount || 0;

        // Lấy finalResult của hóa đơn trước đó
        const lastFinalResult = previousBill.finalResult || 0;

        // Tính toán chênh lệch
        const amountDifference = lastFinalResult - currentToaCu;

        // Thêm vào kết quả nếu có chênh lệch
        if (amountDifference !== 0) {
          customerResult.push({
            currentDate: currentBill.billDate,
            currentToaCu: currentToaCu,
            lastDate: previousBill.billDate,
            lastFinalResult: lastFinalResult,
            paid: amountDifference,
          });
        }
      }

      // Nếu có kết quả cho khách hàng này, thêm vào danh sách tất cả các kết quả
      if (customerResult.length > 0) {
        allCustomerResults.push({
          customerId: customerId,
          customerName: customer.name, // Giả sử bạn có tên khách hàng
          results: customerResult,
        });
      }
    }

    return allCustomerResults;
  }
}
