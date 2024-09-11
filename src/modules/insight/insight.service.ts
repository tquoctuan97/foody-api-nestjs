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

    console.log({ customerPaid });

    // Lấy bill gần nhất để kiểm tra nợ (debt)
    const latestBill = await this.billModel
      .findOne({ customerId: new Types.ObjectId(customerId), deletedAt: null })
      .sort({ billDate: -1, createdAt: -1 })
      .exec();

    console.log({ latestBill });

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

    console.log({ matchStage, from, to });

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
}
