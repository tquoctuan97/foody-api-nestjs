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
    const currentPage = parseInt(query?.page?.toString()) || 1;
    const pageSize = parseInt(query?.pageSize?.toString()) || 10;

    const user = (req as any).user;
    const userDetail = await this.userService.findById(user.id);
    const userIsAdmin = userDetail.role === 'admin';

    const queryRetailer: FilterQuery<SupplyOrder> = {
      ...(query?.supplierId && { supplierId: query.supplierId }),
      ...(query?.retailerId && {
        retailerId: new Types.ObjectId(query.retailerId),
      }),
      ...(query?.orderDate && { orderDate: query.orderDate }),
      ...(userIsAdmin
        ? query?.isDeleted !== undefined && { isDeleted: query?.isDeleted }
        : { isDeleted: false }),
      ...(query?.isPaidComplete !== undefined && { isPaidComplete: query?.isPaidComplete }),
      ...(!userIsAdmin && {
        retailerId: {
          $in: [
            ...userDetail.ownedRetailer,
            ...userDetail.modRetailer,
          ],
        },
      }),
    };

    const totalCount = await this.supplyOrderModel.countDocuments(
      queryRetailer,
    );

    const data = await this.supplyOrderModel
      .find(queryRetailer)
      .sort(query?.sort || '-createdAt')
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize)
      .select(userIsAdmin ? '-createdAt -updatedAt -__v -items' : '-createdAt -updatedAt -__v -items -isDeleted')
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

  async findOne(id: string, req): Promise<SupplyOrderDocument> {
    const user = (req as any).user;
    const userDetail = await this.userService.findById(user.id);
    const userIsAdmin = userDetail.role === 'admin';

    // Kiểm tra quyền truy cập
    if (!userIsAdmin) {
      const supplyOrder = await this.supplyOrderModel.findById(id).lean().exec();
      if (!supplyOrder) {
        throw new NotFoundException(`SupplyOrder with ID ${id} not found`);
      }

      const hasAccess = [...userDetail.ownedRetailer, ...userDetail.modRetailer].some(
        retailerId => retailerId.toString() === supplyOrder.retailerId.toString()
      );

      if (!hasAccess) {
        throw new NotFoundException(`SupplyOrder with ID ${id} not found or you don't have permission`);
      }
    }

    const supplyOrder = await this.supplyOrderModel
      .findById(id)
      .where(userIsAdmin ? {} : { isDeleted: false })
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
    const existingSupplyOrder = await this.supplyOrderModel.findById(id).exec();
    if (!existingSupplyOrder) {
      throw new NotFoundException('SupplyOrder not found');
    }
    
    if (existingSupplyOrder.isDeleted) {
      throw new BadRequestException('SupplyOrder is deleted');
    }

    const user = (req as any).user;
    const userDetail = await this.userService.findById(user.id);
    const userIsAdmin = userDetail.role === 'admin';

    // Kiểm tra quyền truy cập
    if (!userIsAdmin) {
      const hasAccess = [...userDetail.ownedRetailer, ...userDetail.modRetailer].some(
        retailerId => retailerId.toString() === existingSupplyOrder.retailerId.toString()
      );

      if (!hasAccess) {
        throw new NotFoundException(`SupplyOrder with ID ${id} not found or you don't have permission to update`);
      }
    }

    const modifiedBy = user.id;
    const updateSupplyOrder = await this.supplyOrderModel
      .findByIdAndUpdate(
        id,
        {
          ...updateSupplyOrderDto,
          ...(updateSupplyOrderDto.retailerId && {
            retailerId: new Types.ObjectId(updateSupplyOrderDto.retailerId),
          }),
          ...(updateSupplyOrderDto.supplierId && {
            supplierId: new Types.ObjectId(updateSupplyOrderDto.supplierId),
          }),
          lastUpdatedBy: new Types.ObjectId(modifiedBy),
        },
        { new: true },
      )
      .exec();
    
    if (!updateSupplyOrder) {
      throw new NotFoundException(`SupplyOrder with ID ${id} not found`);
    }

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
    const existingSupplyOrder = await this.supplyOrderModel.findById(id).exec();
    if (!existingSupplyOrder) {
      throw new NotFoundException('SupplyOrder not found');
    }
    
    if (existingSupplyOrder.isDeleted) {
      throw new BadRequestException('SupplyOrder is already deleted');
    }

    const user = (req as any).user;
    const userDetail = await this.userService.findById(user.id);
    const userIsAdmin = userDetail.role === 'admin';

    // Kiểm tra quyền truy cập
    if (!userIsAdmin) {
      const hasAccess = userDetail.ownedRetailer.some(
        retailerId => retailerId.toString() === existingSupplyOrder.retailerId.toString()
      );

      if (!hasAccess) {
        throw new NotFoundException(`SupplyOrder with ID ${id} not found or you don't have permission to delete`);
      }
    }

    const modifiedBy = user.id;
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
      oldData: existingSupplyOrder,
      newData: updatedSupplyOrder,
    });
    
    return updatedSupplyOrder;
  }

  async hardDelete(id: string, req): Promise<SupplyOrderDocument> {
    const existingSupplyOrder = await this.supplyOrderModel.findById(id).exec();
    if (!existingSupplyOrder) {
      throw new NotFoundException('SupplyOrder not found');
    }

    const user = (req as any).user;
    const userDetail = await this.userService.findById(user.id);
    const userIsAdmin = userDetail.role === 'admin';

    // Chỉ admin mới có quyền hard delete
    if (!userIsAdmin) {
      throw new BadRequestException('Only admin can perform hard delete');
    }

    const modifiedBy = user.id;
    const deletedSupplyOrder = await this.supplyOrderModel
      .findByIdAndDelete(id)
      .lean()
      .exec();
    
    if (!deletedSupplyOrder) {
      throw new NotFoundException(`SupplyOrder with ID ${id} not found`);
    }

    await this.auditLogsService.createLog({
      retailerId: new Types.ObjectId(deletedSupplyOrder.retailerId),
      modifiedBy: new Types.ObjectId(modifiedBy),
      module: AUDIT_LOG_MODULE_ENUM.SUPPLY_ORDER,
      action: AUDIT_LOG_ACTION_ENUM.HARD_DELETE,
      oldData: existingSupplyOrder,
      newData: null,
    });
    
    return deletedSupplyOrder as SupplyOrderDocument;
  }

  async restore(id: string, req): Promise<SupplyOrderDocument> {
    const existingSupplyOrder = await this.supplyOrderModel.findById(id).exec();
    if (!existingSupplyOrder) {
      throw new NotFoundException('SupplyOrder not found');
    }
    
    if (!existingSupplyOrder.isDeleted) {
      throw new BadRequestException('SupplyOrder is not deleted');
    }

    const user = (req as any).user;
    const userDetail = await this.userService.findById(user.id);
    const userIsAdmin = userDetail.role === 'admin';

    // Kiểm tra quyền truy cập
    if (!userIsAdmin) {
      const hasAccess = userDetail.ownedRetailer.some(
        retailerId => retailerId.toString() === existingSupplyOrder.retailerId.toString()
      );

      if (!hasAccess) {
        throw new NotFoundException(`SupplyOrder with ID ${id} not found or you don't have permission to restore`);
      }
    }

    const modifiedBy = user.id;
    const restoredSupplyOrder = await this.supplyOrderModel
      .findByIdAndUpdate(
        id,
        {
          isDeleted: false,
          deletedBy: null,
          deletedAt: null,
          lastUpdatedBy: new Types.ObjectId(modifiedBy),
        },
        { new: true },
      )
      .exec();
    
    if (!restoredSupplyOrder) {
      throw new NotFoundException(`SupplyOrder with ID ${id} not found`);
    }

    await this.auditLogsService.createLog({
      retailerId: new Types.ObjectId(restoredSupplyOrder.retailerId),
      modifiedBy: new Types.ObjectId(modifiedBy),
      module: AUDIT_LOG_MODULE_ENUM.SUPPLY_ORDER,
      action: AUDIT_LOG_ACTION_ENUM.RESTORE,
      oldData: existingSupplyOrder,
      newData: restoredSupplyOrder,
    });
    
    return restoredSupplyOrder;
  }
}
