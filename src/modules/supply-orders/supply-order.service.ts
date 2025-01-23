import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  AUDIT_LOG_ACTION_ENUM,
  AUDIT_LOG_MODULE_ENUM,
} from '../audit-logs/audit-logs.constant';

import {
  SupplyOrder,
  SupplyOrderDocument,
} from './entities/supply-order.entity';
import {
  CreateSupplyOrderDto,
  SupplyOrderFilterDto,
  UpdateSupplyOrderDto,
} from './dto/supply-order.dto';
import { UsersService } from '../users/users.service';
import { FilterQuery } from 'mongoose';
import { PaginationDto } from 'src/common/pagination/pagination.dto';

@Injectable()
export class SupplyOrderService {
  constructor(
    @InjectModel(SupplyOrder.name)
    private supplyOrderModel: Model<SupplyOrderDocument>,
    private readonly auditLogsService: AuditLogsService,
    private readonly userService: UsersService,
  ) {}

  async create(
    createSupplyOrderDto: CreateSupplyOrderDto,
    req,
  ): Promise<SupplyOrderDocument> {
    const supplyOrder = new this.supplyOrderModel({
      ...createSupplyOrderDto,
      createdBy: new Types.ObjectId(req.user.id),
      retailerId: new Types.ObjectId(createSupplyOrderDto.retailerId),
      supplierId: new Types.ObjectId(createSupplyOrderDto.supplierId),
    });
    try {
      const savedSupplyOrder = await supplyOrder.save();
      // Create audit log
      await this.auditLogsService.createLog({
        retailerId: new Types.ObjectId(savedSupplyOrder.retailerId),
        modifiedBy: new Types.ObjectId(req.user?.id),
        module: AUDIT_LOG_MODULE_ENUM.SUPPLY_ORDER,
        action: AUDIT_LOG_ACTION_ENUM.CREATE,
        oldData: null,
        newData: savedSupplyOrder,
      });
      return savedSupplyOrder;
    } catch (e) {
      throw new BadRequestException('Failed to create Supply Order');
    }
  }

  async findAll(query: SupplyOrderFilterDto, req) {
    const currentPage = parseInt(query?.page) || 1;
    const pageSize = parseInt(query?.pageSize) || 10;

    // const { billDate, billDateFrom, billDateTo } =
    //   this.validateAndParseDates(query);

    const user = (req as any).user;
    const userDetail = await this.userService.findById(user.id);

    console.log('supply-orders', userDetail);

    const queryRetailer: FilterQuery<SupplyOrder> = {
      ...(query?.supplierId && { supplierId: query.supplierId }),
      ...(query?.retailerId && { retailerId: query.retailerId }),
      ...(query?.orderDate && { orderDate: query.orderDate }),
      isDeleted: query?.isDeleted,
      isPaidComplete: query?.isPaidComplete,

      // ...(userDetail.role !== 'admin' && {
      //   $or: [
      //     { retailerId: { $in: userDetail.ownedRetailer } },
      //     { retailerId: { $in: userDetail.modRetailer } },
      //     { retailerId: query.retailerId },
      //   ],
      // }),
    };

    const totalCount = await this.supplyOrderModel.countDocuments(
      queryRetailer,
    );

    const data = await this.supplyOrderModel
      .find(queryRetailer)
      .sort(query?.sort || '-createdAt')
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize)
      .select('-createdAt -updatedAt -__v -items -isDeleted')
      .populate({ path: 'retailerId', select: '_id name' })
      .populate({ path: 'supplierId', select: '_id name' })
      .populate({
        path: 'createdBy',
        select: '_id name email avatar',
      })
      .populate({
        path: 'lastUpdatedBy',
        select: '_id name email avatar',
      })
      .populate({
        path: 'deletedBy',
        select: '_id name email avatar',
      })
      .lean<SupplyOrder[]>()
      .exec();

    const response = new PaginationDto<SupplyOrder[]>(data, {
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

  async findOne(id: string): Promise<SupplyOrderDocument> {
    const supplyOrder = await this.supplyOrderModel
      .findById(id)
      .populate({ path: 'retailerId', select: '_id name' })
      .populate({ path: 'supplierId', select: '_id name' })
      .populate({
        path: 'items.goodId',
        select: '_id name unit description category',
      })
      .populate({
        path: 'createdBy',
        select: '_id name email avatar',
      })
      .populate({
        path: 'lastUpdatedBy',
        select: '_id name email avatar',
      })
      .populate({
        path: 'deletedBy',
        select: '_id name email avatar',
      })
      .exec();
    if (!supplyOrder) {
      throw new NotFoundException(`SupplyOrder with ID ${id} not found`);
    }

    return supplyOrder;
  }

  async update(
    id: string,
    updateSupplyOrderDto: UpdateSupplyOrderDto,
    req,
  ): Promise<SupplyOrderDocument> {
    const modifiedBy = (req as any).user?.id;
    const existingSupplyOrder = await this.supplyOrderModel.findById(id).exec();
    if (!existingSupplyOrder) {
      throw new NotFoundException('SupplyOrder not found');
    }
    const updateSupplyOrder = await this.supplyOrderModel
      .findByIdAndUpdate(
        id,
        {
          ...updateSupplyOrderDto,
          lastUpdatedBy: new Types.ObjectId(modifiedBy),
        },
        { new: true },
      )
      .exec();

    await this.auditLogsService.createLog({
      retailerId: new Types.ObjectId(updateSupplyOrder.retailerId),
      modifiedBy: new Types.ObjectId(modifiedBy),
      module: AUDIT_LOG_MODULE_ENUM.SUPPLY_ORDER,
      action: AUDIT_LOG_ACTION_ENUM.UPDATE,
      oldData: existingSupplyOrder,
      newData: updateSupplyOrder,
    });

    return updateSupplyOrder;
  }

  async remove(id: string, req): Promise<SupplyOrderDocument> {
    const modifiedBy = (req as any).user?.id;
    const updatedSupplyOrder = await this.supplyOrderModel
      .findByIdAndUpdate(
        id,
        {
          isDeleted: true,
          deletedBy: new Types.ObjectId(modifiedBy),
          deletedAt: new Date(),
        },
        { new: true },
      )
      .exec();
    if (!updatedSupplyOrder) {
      throw new NotFoundException('SupplyOrder not found');
    }

    await this.auditLogsService.createLog({
      retailerId: new Types.ObjectId(updatedSupplyOrder.retailerId),
      modifiedBy: new Types.ObjectId(modifiedBy),
      module: AUDIT_LOG_MODULE_ENUM.SUPPLY_ORDER,
      action: AUDIT_LOG_ACTION_ENUM.DELETE,
      oldData: updatedSupplyOrder,
      newData: null,
    });
    return updatedSupplyOrder;
  }
}
