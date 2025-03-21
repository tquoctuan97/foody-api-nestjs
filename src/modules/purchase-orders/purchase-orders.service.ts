import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { FilterQuery, Model } from 'mongoose';
import { PaginationDto } from 'src/common/pagination/pagination.dto';
import { AUDIT_LOG_ACTION_ENUM, AUDIT_LOG_MODULE_ENUM } from '../audit-logs/audit-logs.constant';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { GoodService } from '../goods/goods.service';
import { UsersService } from '../users/users.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { PurchaseOrder, PurchaseOrderDocument } from './entities/purchase-order.entity';
import { PurchaseOrderFilterDto } from './models/purchase-order.model';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @InjectModel(PurchaseOrder.name)
    private readonly purchaseOrderModel: Model<PurchaseOrderDocument>,
    private readonly auditLogsService: AuditLogsService,
    private readonly userService: UsersService,
    private readonly goodService: GoodService,
  ) {}

  /**
   * Kiểm tra và chuyển đổi định dạng ngày tháng
   */
  private validateAndParseDates(query: PurchaseOrderFilterDto): {
    orderDate?: Date;
    orderDateFrom?: Date;
    orderDateTo?: Date;
  } {
    const dates: any = {};

    ['orderDate', 'orderDateFrom', 'orderDateTo'].forEach((key) => {
      if (query[key]) {
        const date = new Date(query[key]);
        if (isNaN(date.getTime())) {
          throw new BadRequestException(`${key} phải là một ngày hợp lệ`);
        }
        dates[key] = date;
      }
    });

    if (
      dates.orderDateFrom &&
      dates.orderDateTo &&
      dates.orderDateFrom > dates.orderDateTo
    ) {
      throw new BadRequestException(
        'orderDateFrom không thể lớn hơn orderDateTo',
      );
    }

    if ((dates.orderDateFrom || dates.orderDateTo) && dates.orderDate) {
      throw new BadRequestException(
        'orderDate không thể sử dụng cùng với orderDateFrom hoặc orderDateTo',
      );
    }

    return dates;
  }

  /**
   * Tạo mới đơn đặt hàng
   */
  async create(
    createPurchaseOrderDto: CreatePurchaseOrderDto,
    req,
  ): Promise<PurchaseOrderDocument> {
    try {
      const userId = req.user.id;
      const userDetail = await this.userService.findById(userId);
      
      // Kiểm tra quyền truy cập vào retailer
      const canAccessRetailer = userDetail.role === 'admin' || 
        userDetail.ownedRetailer.some(id => id.toString() === createPurchaseOrderDto.retailerId) ||
        userDetail.modRetailer.some(id => id.toString() === createPurchaseOrderDto.retailerId);
      
      if (!canAccessRetailer) {
        throw new ForbiddenException('Bạn không có quyền tạo đơn đặt hàng cho cửa hàng này');
      }

      // Chỉ điền thông tin tên sản phẩm nếu cần
      if (createPurchaseOrderDto.items && createPurchaseOrderDto.items.length > 0) {
        createPurchaseOrderDto.items = await this.fillGoodsInfo(createPurchaseOrderDto.items, req);
      }

      // Không tính toán lại subtotal và total, giữ nguyên giá trị được gửi từ frontend

      const purchaseOrder = new this.purchaseOrderModel({
        ...createPurchaseOrderDto,
        retailerId: new mongoose.Types.ObjectId(createPurchaseOrderDto.retailerId),
        customerId: new mongoose.Types.ObjectId(createPurchaseOrderDto.customerId),
        createdBy: new mongoose.Types.ObjectId(userId),
      });

      const savedPurchaseOrder = await purchaseOrder.save();

      // Tạo audit log
      await this.auditLogsService.createLog({
        retailerId: new mongoose.Types.ObjectId(savedPurchaseOrder.retailerId),
        modifiedBy: new mongoose.Types.ObjectId(userId),
        module: AUDIT_LOG_MODULE_ENUM.PURCHASE_ORDER,
        action: AUDIT_LOG_ACTION_ENUM.CREATE,
        oldData: null,
        newData: savedPurchaseOrder,
      });

      return savedPurchaseOrder;
    } catch (error) {
      console.error('Failed to create purchase order:', error);
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new InternalServerErrorException('Không thể tạo đơn đặt hàng');
    }
  }

  /**
   * Lấy danh sách đơn đặt hàng với phân trang và lọc
   */
  async findAll(query: PurchaseOrderFilterDto, req): Promise<PaginationDto<PurchaseOrderDocument[]>> {
    const currentPage = parseInt(query?.page?.toString()) || 1;
    const pageSize = parseInt(query?.pageSize?.toString()) || 10;

    const { orderDate, orderDateFrom, orderDateTo } = this.validateAndParseDates(query);

    const user = req.user;
    const userDetail = await this.userService.findById(user.id);
    const userIsAdmin = userDetail.role === 'admin';
    const userIsOwner = userDetail.ownedRetailer.some(
      retailerId => retailerId.toString() === query?.retailerId?.toString()
    );
    // const userIsMod = userDetail.modRetailer.some(
    //   retailerId => retailerId.toString() === query?.retailerId?.toString()
    // );

    // Xây dựng query filter
    const queryFilter: FilterQuery<PurchaseOrder> = {
      ...(query?.retailerId && {
        retailerId: new mongoose.Types.ObjectId(query.retailerId),
      }),
      ...(query?.customerId && {
        customerId: new mongoose.Types.ObjectId(query.customerId),
      }),
      ...(query?.status && { status: query.status }),
      ...(orderDate && { orderDate }),
      ...(orderDateFrom && { orderDate: { $gte: orderDateFrom } }),
      ...(orderDateTo && { orderDate: { $lte: orderDateTo } }),
      ...(orderDateFrom && orderDateTo && {
        orderDate: { $gte: orderDateFrom, $lte: orderDateTo },
      }),
      ...(query?.search && {
        notes: { $regex: query.search, $options: 'i' },
      }),
      
      // Quản lý trạng thái deleted dựa trên quyền
      ...(userIsAdmin || userIsOwner
        ? query?.isDeleted !== undefined && { isDeleted: query?.isDeleted }
        : { isDeleted: false }),
      
      // Đảm bảo user chỉ có thể xem các đơn hàng trong retailer mà họ có quyền
      ...(!userIsAdmin && {
        $and: [
          {
            retailerId: {
              $in: [
                ...userDetail.ownedRetailer,
                ...userDetail.modRetailer,
              ],
            }
          },
          ...(query?.retailerId ? [{ retailerId: new mongoose.Types.ObjectId(query.retailerId) }] : [])
        ]
      }),
    };

    const totalCount = await this.purchaseOrderModel.countDocuments(queryFilter);

    const data = await this.purchaseOrderModel
      .find(queryFilter)
      .sort(query?.sort || '-createdAt')
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize)
      .select(userIsAdmin || userIsOwner ? '-items -adjustmentList' : '-isDeleted -items -adjustmentList')
      .populate([
        {
          path: 'retailerId',
          select: '_id name',
        },
        {
          path: 'customerId',
          select: '_id name displayName phoneNumber',
        },
        {
          path: 'items.goodId',
          select: '_id name description category unit',
        },
        ...['createdBy', 'updatedBy', 'deletedBy'].map((path) => ({
          path,
          select: '_id name email avatar',
        })),
      ])
      .lean()
      .exec();

    return new PaginationDto<PurchaseOrderDocument[]>(data, {
      pageSize,
      currentPage,
      totalPages: Math.ceil(totalCount / pageSize),
      totalCount,
      hasNextPage: currentPage < Math.ceil(totalCount / pageSize),
    });
  }

  /**
   * Lấy thông tin chi tiết một đơn đặt hàng
   */
  async findOne(id: string, req): Promise<PurchaseOrderDocument> {
    if (!mongoose.isValidObjectId(id)) {
      throw new BadRequestException('ID không hợp lệ');
    }

    const purchaseOrder = await this.purchaseOrderModel
      .findById(id)
      .populate([
        {
          path: 'retailerId',
          select: '_id name',
        },
        {
          path: 'customerId',
          select: '_id name displayName phoneNumber',
        },
        {
          path: 'items.goodId',
          select: '_id name description category unit',
        },
        ...['createdBy', 'updatedBy', 'deletedBy'].map((path) => ({
          path,
          select: '_id name email avatar',
        })),
      ])
      .exec();

    if (!purchaseOrder) {
      throw new NotFoundException(`Không tìm thấy đơn đặt hàng với ID ${id}`);
    }

    // Kiểm tra quyền truy cập
    const user = req.user;
    const userDetail = await this.userService.findById(user.id);
    const userIsAdmin = userDetail.role === 'admin';
    const userIsOwner = userDetail.ownedRetailer.some(
      retailerId => retailerId.toString() === purchaseOrder.retailerId.toString()
    );
    const userIsMod = userDetail.modRetailer.some(
      retailerId => retailerId.toString() === purchaseOrder.retailerId.toString()
    );

    if (!userIsAdmin && !userIsOwner && !userIsMod) {
      throw new ForbiddenException('Bạn không có quyền xem đơn đặt hàng này');
    }

    // Kiểm tra xem có thể xem đơn hàng đã xóa không
    if (purchaseOrder.isDeleted && !userIsAdmin && !userIsOwner) {
      throw new ForbiddenException('Bạn không có quyền xem đơn đặt hàng này');
    }

    return purchaseOrder;
  }

  /**
   * Cập nhật thông tin đơn đặt hàng
   */
  async update(
    id: string,
    updatePurchaseOrderDto: UpdatePurchaseOrderDto,
    req,
  ): Promise<PurchaseOrderDocument> {
    if (!mongoose.isValidObjectId(id)) {
      throw new BadRequestException('ID không hợp lệ');
    }

    const purchaseOrder = await this.purchaseOrderModel.findById(id);

    if (!purchaseOrder) {
      throw new NotFoundException(`Không tìm thấy đơn đặt hàng với ID ${id}`);
    }

    if (purchaseOrder.isDeleted) {
      throw new BadRequestException('Không thể cập nhật đơn đặt hàng đã xóa');
    }

    // Kiểm tra quyền truy cập
    const user = req.user;
    const userDetail = await this.userService.findById(user.id);
    const userIsAdmin = userDetail.role === 'admin';
    const userIsOwner = userDetail.ownedRetailer.some(
      retailerId => retailerId.toString() === purchaseOrder.retailerId.toString()
    );
    const userIsMod = userDetail.modRetailer.some(
      retailerId => retailerId.toString() === purchaseOrder.retailerId.toString()
    );

    if (!userIsAdmin && !userIsOwner && !userIsMod) {
      throw new ForbiddenException('Bạn không có quyền cập nhật đơn đặt hàng này');
    }

    // Tạo audit log trước khi cập nhật
    const oldData = purchaseOrder.toObject();

    // Chỉ điền thông tin tên sản phẩm nếu cần
    if (updatePurchaseOrderDto.items && updatePurchaseOrderDto.items.length > 0) {
      updatePurchaseOrderDto.items = await this.fillGoodsInfo(updatePurchaseOrderDto.items, req);
    }

    // Không tính toán lại subtotal và total, giữ nguyên giá trị được gửi từ frontend

    // Cập nhật dữ liệu
    const updateData = {
      ...updatePurchaseOrderDto,
      ...(updatePurchaseOrderDto.retailerId && {
        retailerId: new mongoose.Types.ObjectId(updatePurchaseOrderDto.retailerId),
      }),
      ...(updatePurchaseOrderDto.customerId && {
        customerId: new mongoose.Types.ObjectId(updatePurchaseOrderDto.customerId),
      }),
      updatedBy: new mongoose.Types.ObjectId(user.id),
    };

    const updatedPurchaseOrder = await this.purchaseOrderModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate([
        {
          path: 'retailerId',
          select: '_id name',
        },
        {
          path: 'customerId',
          select: '_id name displayName phoneNumber',
        },
        ...['createdBy', 'updatedBy', 'deletedBy'].map((path) => ({
          path,
          select: '_id name email avatar',
        })),
      ])
      .exec();

    // Lưu audit log
    await this.auditLogsService.createLog({
      retailerId: new mongoose.Types.ObjectId(updatedPurchaseOrder.retailerId),
      modifiedBy: new mongoose.Types.ObjectId(user.id),
      module: AUDIT_LOG_MODULE_ENUM.PURCHASE_ORDER,
      action: AUDIT_LOG_ACTION_ENUM.UPDATE,
      oldData,
      newData: updatedPurchaseOrder,
    });

    return updatedPurchaseOrder;
  }

  /**
   * Soft delete - Xóa mềm đơn đặt hàng
   */
  async remove(id: string, req): Promise<PurchaseOrderDocument> {
    if (!mongoose.isValidObjectId(id)) {
      throw new BadRequestException('ID không hợp lệ');
    }

    const purchaseOrder = await this.purchaseOrderModel.findById(id);

    if (!purchaseOrder) {
      throw new NotFoundException(`Không tìm thấy đơn đặt hàng với ID ${id}`);
    }

    if (purchaseOrder.isDeleted) {
      throw new BadRequestException('Đơn đặt hàng này đã bị xóa');
    }

    // Kiểm tra quyền truy cập (chỉ admin và owner mới có quyền xóa)
    const user = req.user;
    const userDetail = await this.userService.findById(user.id);
    const userIsAdmin = userDetail.role === 'admin';
    const userIsOwner = userDetail.ownedRetailer.some(
      retailerId => retailerId.toString() === purchaseOrder.retailerId.toString()
    );

    if (!userIsAdmin && !userIsOwner) {
      throw new ForbiddenException('Bạn không có quyền xóa đơn đặt hàng này');
    }

    // Tạo audit log trước khi xóa
    const oldData = purchaseOrder.toObject();

    // Cập nhật thông tin xóa
    purchaseOrder.isDeleted = true;
    purchaseOrder.deletedAt = new Date();
    purchaseOrder.deletedBy = new mongoose.Types.ObjectId(user.id);

    await purchaseOrder.save();

    // Lưu audit log
    await this.auditLogsService.createLog({
      retailerId: new mongoose.Types.ObjectId(purchaseOrder.retailerId),
      modifiedBy: new mongoose.Types.ObjectId(user.id),
      module: AUDIT_LOG_MODULE_ENUM.PURCHASE_ORDER,
      action: AUDIT_LOG_ACTION_ENUM.DELETE,
      oldData,
      newData: purchaseOrder,
    });

    return purchaseOrder;
  }

  /**
   * Hard delete - Xóa vĩnh viễn đơn đặt hàng (chỉ admin)
   */
  async hardDelete(id: string, req): Promise<PurchaseOrderDocument> {
    if (!mongoose.isValidObjectId(id)) {
      throw new BadRequestException('ID không hợp lệ');
    }

    const purchaseOrder = await this.purchaseOrderModel.findById(id);

    if (!purchaseOrder) {
      throw new NotFoundException(`Không tìm thấy đơn đặt hàng với ID ${id}`);
    }

    // Kiểm tra quyền truy cập (chỉ admin mới có quyền xóa vĩnh viễn)
    const user = req.user;
    const userDetail = await this.userService.findById(user.id);
    
    if (userDetail.role !== 'admin') {
      throw new ForbiddenException('Chỉ admin mới có quyền xóa vĩnh viễn đơn đặt hàng');
    }

    // Tạo audit log trước khi xóa vĩnh viễn
    const oldData = purchaseOrder.toObject();

    // Xóa vĩnh viễn
    await this.purchaseOrderModel.findByIdAndDelete(id);

    // Lưu audit log
    await this.auditLogsService.createLog({
      retailerId: new mongoose.Types.ObjectId(purchaseOrder.retailerId),
      modifiedBy: new mongoose.Types.ObjectId(user.id),
      module: AUDIT_LOG_MODULE_ENUM.PURCHASE_ORDER,
      action: AUDIT_LOG_ACTION_ENUM.HARD_DELETE,
      oldData,
      newData: null,
    });

    return purchaseOrder;
  }

  /**
   * Khôi phục đơn đặt hàng đã xóa
   */
  async restore(id: string, req): Promise<PurchaseOrderDocument> {
    if (!mongoose.isValidObjectId(id)) {
      throw new BadRequestException('ID không hợp lệ');
    }

    const purchaseOrder = await this.purchaseOrderModel.findById(id);

    if (!purchaseOrder) {
      throw new NotFoundException(`Không tìm thấy đơn đặt hàng với ID ${id}`);
    }

    if (!purchaseOrder.isDeleted) {
      throw new BadRequestException('Đơn đặt hàng này chưa bị xóa');
    }

    // Kiểm tra quyền truy cập (chỉ admin và owner mới có quyền khôi phục)
    const user = req.user;
    const userDetail = await this.userService.findById(user.id);
    const userIsAdmin = userDetail.role === 'admin';
    const userIsOwner = userDetail.ownedRetailer.some(
      retailerId => retailerId.toString() === purchaseOrder.retailerId.toString()
    );

    if (!userIsAdmin && !userIsOwner) {
      throw new ForbiddenException('Bạn không có quyền khôi phục đơn đặt hàng này');
    }

    // Tạo audit log trước khi khôi phục
    const oldData = purchaseOrder.toObject();

    // Cập nhật thông tin khôi phục
    purchaseOrder.isDeleted = false;
    purchaseOrder.deletedAt = null;
    purchaseOrder.updatedBy = new mongoose.Types.ObjectId(user.id);

    await purchaseOrder.save();

    // Lưu audit log
    await this.auditLogsService.createLog({
      retailerId: new mongoose.Types.ObjectId(purchaseOrder.retailerId),
      modifiedBy: new mongoose.Types.ObjectId(user.id),
      module: AUDIT_LOG_MODULE_ENUM.PURCHASE_ORDER,
      action: AUDIT_LOG_ACTION_ENUM.RESTORE,
      oldData,
      newData: purchaseOrder,
    });

    return purchaseOrder;
  }

  // Helper method to fetch and fill goods information
  private async fillGoodsInfo(items: any[], req): Promise<any[]> {
    for (const item of items) {
      if (item.goodId && !item.name) {
        try {
          const good = await this.goodService.findOne(item.goodId, req);
          if (good) {
            // Chỉ tự động điền tên sản phẩm
            item.name = good.name;
            // Không điền price hoặc tính toán total - các giá trị này sẽ được FE gửi lên
          }
        } catch (error) {
          // If good is not found, we don't throw error but just log it
          console.warn(`Good with ID ${item.goodId} not found or not accessible`);
        }
      }
    }
    return items;
  }
} 