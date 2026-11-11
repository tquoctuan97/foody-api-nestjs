import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import {
  assertNotSoftDeleted,
  assertOwnerOrAdmin,
  setCreatedBy,
  setUpdatedBy,
  softDeleteAudit,
} from 'src/common/audit/audit-user';
import {
  buildPaginatedResult,
  parsePagination,
  softDeleteFilter,
} from 'src/common/pagination/paginate';
import { UserRequest } from '../auth/models/auth.model';
import { CreateBillDto } from './dto/create-bill.dto';
import { BulkPatchBillsDto } from './dto/bulk-patch-bills.dto';
import { UpdateBillDto } from './dto/update-bill.dto';
import { Bill } from './entities/bill.entity';
import { BillParams } from './models/bill.model';
import { billDetailPopulateOptions } from './bill-populate';

@Injectable()
export class BillsService {
  constructor(
    @InjectModel(Bill.name) private readonly billModel: Model<Bill>,
  ) {}

  private validateAndParseDates(query: BillParams): {
    billDate?: Date;
    billDateFrom?: Date;
    billDateTo?: Date;
  } {
    const dates: { billDate?: Date; billDateFrom?: Date; billDateTo?: Date } =
      {};
    for (const key of ['billDate', 'billDateFrom', 'billDateTo'] as const) {
      if (query[key]) {
        const date = new Date(query[key]);
        if (isNaN(date.getTime())) {
          throw new BadRequestException(`${key} must be a valid date`);
        }
        dates[key] = date;
      }
    }

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
    const { currentPage, pageSize } = parsePagination(query);

    const { billDate, billDateFrom, billDateTo } =
      this.validateAndParseDates(query);

    const queryBill: FilterQuery<Bill> = {
      customerName: new RegExp(query?.search || '', 'i'),
      ...(query?.customerId && {
        customerId: new Types.ObjectId(query.customerId),
      }),
      ...(billDate && { billDate }),
      ...(billDateFrom &&
        billDateTo && { billDate: { $gte: billDateFrom, $lte: billDateTo } }),
      ...(billDateFrom &&
        !billDateTo && { billDate: { $gte: billDateFrom } }),
      ...(billDateTo && !billDateFrom && { billDate: { $lte: billDateTo } }),
      ...softDeleteFilter(query?.isDeleted),
    };

    const totalCount = await this.billModel.countDocuments(queryBill);

    const data = await this.billModel
      .find(queryBill)
      .sort(query?.sort || '-createdAt')
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize)
      .populate(billDetailPopulateOptions())
      .lean<Bill[]>()
      .exec();

    return buildPaginatedResult(data, totalCount, currentPage, pageSize);
  }

  async getOne(id: string) {
    const bill = await this.billModel.findById(id).exec();

    if (!bill) {
      throw new NotFoundException(`Bill ${id} is not found`);
    }

    return bill.populate(billDetailPopulateOptions());
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
      customerId: customerId ? new Types.ObjectId(customerId) : null,
      debt,
      finalResult,
      prePay,
      sum,
      adjustmentList,
      ...setCreatedBy(user.id),
    });

    await newBill.save();

    return newBill.populate(billDetailPopulateOptions());
  }

  async update(user: UserRequest, id: string, updateBillDto: UpdateBillDto) {
    const bill = await this.billModel.findById(id).exec();

    if (!bill) {
      throw new NotFoundException(`Bill ${id} is not found`);
    }

    assertOwnerOrAdmin(user, bill.createdBy, 'update this bill');
    assertNotSoftDeleted(bill.deletedAt, 'bill');

    await bill
      .set({
        ...updateBillDto,
        ...(updateBillDto.customerId && {
          customerId: new Types.ObjectId(updateBillDto.customerId),
        }),
        ...setUpdatedBy(user.id),
      })
      .save();

    return bill.populate(billDetailPopulateOptions());
  }

  async delete(user: UserRequest, id: string) {
    const bill = await this.billModel.findById(id).exec();

    if (!bill) {
      throw new NotFoundException(`Bill ${id} is not found`);
    }

    assertOwnerOrAdmin(user, bill.createdBy, 'delete this bill');

    await bill.set(softDeleteAudit(user.id)).save();

    return bill.populate(billDetailPopulateOptions());
  }

  async bulkPatch(user: UserRequest, dto: BulkPatchBillsDto) {
    const hasBillDate = dto.billDate != null;
    const hasCustomerName = dto.customerName !== undefined;
    const hasCustomerId = dto.customerId !== undefined;

    if (!hasBillDate && !hasCustomerName && !hasCustomerId) {
      throw new BadRequestException(
        'Provide at least one of billDate, customerName, customerId',
      );
    }

    const uniqueIds = [...new Set(dto.ids.map((id) => id.toLowerCase()))];
    const objectIds = uniqueIds.map((id) => new Types.ObjectId(id));

    const bills = await this.billModel
      .find({ _id: { $in: objectIds }, deletedAt: null })
      .select('createdBy')
      .lean()
      .exec();

    if (bills.length !== uniqueIds.length) {
      const found = new Set(bills.map((bill) => bill._id.toString()));
      const missing = uniqueIds.filter((id) => !found.has(id));
      throw new NotFoundException(`Bill not found: ${missing.join(', ')}`);
    }

    bills.forEach((bill) => {
      assertOwnerOrAdmin(user, bill.createdBy, 'update this bill');
    });

    const $set: Record<string, unknown> = {
      ...setUpdatedBy(user.id),
    };

    if (hasBillDate) {
      $set.billDate = dto.billDate;
    }
    if (hasCustomerName) {
      $set.customerName = dto.customerName!.trim();
    }
    if (hasCustomerId) {
      $set.customerId =
        dto.customerId == null || dto.customerId === ''
          ? null
          : new Types.ObjectId(dto.customerId);
    }

    const { modifiedCount } = await this.billModel.updateMany(
      { _id: { $in: objectIds }, deletedAt: null },
      { $set },
    );

    return { updated: modifiedCount };
  }

  async deleteMany(user: UserRequest, ids: string[]) {
    const uniqueIds = [...new Set(ids.map((id) => id.toLowerCase()))];
    const objectIds = uniqueIds.map((id) => new Types.ObjectId(id));

    const bills = await this.billModel
      .find({ _id: { $in: objectIds }, deletedAt: null })
      .select('createdBy')
      .lean()
      .exec();

    if (bills.length !== uniqueIds.length) {
      const found = new Set(bills.map((bill) => bill._id.toString()));
      const missing = uniqueIds.filter((id) => !found.has(id));
      throw new NotFoundException(`Bill not found: ${missing.join(', ')}`);
    }

    bills.forEach((bill) => {
      assertOwnerOrAdmin(user, bill.createdBy, 'delete this bill');
    });

    const audit = softDeleteAudit(user.id);
    const { modifiedCount } = await this.billModel.updateMany(
      { _id: { $in: objectIds }, deletedAt: null },
      { $set: audit },
    );

    return { deleted: modifiedCount };
  }

  async getLatestBill(customerId: string): Promise<Bill | null> {
    const latestBill = await this.billModel
      .findOne({
        customerId: new Types.ObjectId(customerId),
        deletedAt: null,
      })
      .sort({ billDate: -1, createdAt: -1 })
      .populate(billDetailPopulateOptions())
      .exec();

    return latestBill ?? null;
  }

}
