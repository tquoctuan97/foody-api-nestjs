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
    top?: number,
  ) {
    const sortField = sortBy === 'quantity' ? 'totalQuantity' : 'totalRevenue';

    const pipeline: any[] = [
      {
        $match: { billDate: { $gte: fromDate, $lte: toDate }, deletedAt: null },
      },
      { $unwind: '$billList' },
      {
        $group: {
          _id: {
            itemName: '$billList.name',
            month: { $month: '$billDate' },
            year: { $year: '$billDate' },
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
          _id: { month: '$_id.month', year: '$_id.year' },
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
          month: '$_id.month',
          year: '$_id.year',
          items: top ? { $slice: ['$items', Number(top)] } : '$items',
        },
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

  async getCustomerOverview(customerId: string): Promise<any> {
    const customerBills = await this.billModel
      .aggregate([
        {
          $match: {
            customerId: new Types.ObjectId(customerId),
            deletedAt: null,
          },
        }, // Tìm tất cả các bill của customerId
        { $unwind: '$billList' }, // Phân rã billList để xử lý từng món hàng
        {
          $group: {
            _id: '$customerId', // Nhóm theo customerId
            billCount: { $sum: 1 }, // Đếm số lượng bill
            totalSpent: {
              $sum: { $multiply: ['$billList.quantity', '$billList.price'] }, // Tổng cộng số lượng * giá của các sản phẩm
            },
          },
        },
      ])
      .exec();
    const customerPaid = await this.billModel
      .aggregate([
        {
          $match: {
            customerId: new Types.ObjectId(customerId),
            deletedAt: null,
          },
        }, // Tìm tất cả các bill của customerId
        { $unwind: '$adjustmentList' }, // Phân rã adjustmentList trong mỗi bill
        {
          $match: {
            'adjustmentList.name': 'Gởi',
            'adjustmentList.type': 'subtract',
          },
        },
        {
          $group: {
            _id: '$customerId', // Nhóm theo customerId
            totalPaid: { $sum: '$adjustmentList.amount' }, // Tính tổng đã trả từ adjustmentList
          },
        },
      ])
      .exec();

    // Lấy bill gần nhất để kiểm tra nợ (debt)
    const latestBill = await this.billModel
      .findOne({ customerId: new Types.ObjectId(customerId), deletedAt: null })
      .sort({ billDate: -1, createdAt: -1 })
      .exec();

    // Lấy nợ từ "Toa cũ" trong adjustmentList nếu có
    const debtAdjustment = latestBill?.adjustmentList?.find(
      (adjustment) => adjustment.name === 'Toa cũ' && adjustment.type === 'add',
    );
    const totalDebt = debtAdjustment?.amount || 0;
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
            totalDebt: 1,
          },
        },
        { $sort: { year: 1, month: 1 } }, // Sort by year and month ascending
      ])
      .exec();
  }
}
