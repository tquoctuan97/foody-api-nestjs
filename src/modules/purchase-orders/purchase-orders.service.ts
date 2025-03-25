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
import { RETAILER_ID_HEADER } from '../retailers/retailer-access.guard';

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
      const retailerId = req.headers[RETAILER_ID_HEADER];
      
      if (!retailerId) {
        throw new BadRequestException('RetailerId is required in x-retailer-id header');
      }
      
      const userId = req.user.id;
      const userDetail = await this.userService.findById(userId);
      
      // Kiểm tra quyền truy cập vào retailer
      const canAccessRetailer = userDetail.role === 'admin' || 
        userDetail.ownedRetailer.some(id => id.toString() === retailerId) ||
        userDetail.modRetailer.some(id => id.toString() === retailerId);
      
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
        retailerId: new mongoose.Types.ObjectId(retailerId),
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
      if (error instanceof ForbiddenException || error instanceof BadRequestException) {
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
    const retailerId = req.headers[RETAILER_ID_HEADER];
    
    if (!retailerId) {
      throw new BadRequestException('RetailerId is required in x-retailer-id header');
    }

    const { orderDate, orderDateFrom, orderDateTo } = this.validateAndParseDates(query);

    const user = req.user;
    const userDetail = await this.userService.findById(user.id);
    const userIsAdmin = userDetail.role === 'admin';
    const userIsOwner = userDetail.ownedRetailer.some(
      id => id.toString() === retailerId
    );

    // Xây dựng query filter
    const queryFilter: FilterQuery<PurchaseOrder> = {
      retailerId: new mongoose.Types.ObjectId(retailerId),
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
      ...(!userIsAdmin && !userIsOwner && {
        $and: [
          {
            retailerId: {
              $in: [
                ...userDetail.ownedRetailer,
                ...userDetail.modRetailer,
              ],
            }
          },
          { retailerId: new mongoose.Types.ObjectId(retailerId) }
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
          path: 'createdBy',
          select: '_id name email avatar',
        },
        {
          path: 'lastUpdatedBy',
          select: '_id name email avatar',
        },
        {
          path: 'deletedBy',
          select: '_id name email avatar',
        },
      ])
      .lean<PurchaseOrderDocument[]>()
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
    const retailerId = req.headers[RETAILER_ID_HEADER];
    
    if (!retailerId) {
      throw new BadRequestException('RetailerId is required in x-retailer-id header');
    }
    
    const existingOrder = await this.purchaseOrderModel.findById(id).lean().exec();
    if (!existingOrder) {
      throw new NotFoundException(`Không tìm thấy đơn đặt hàng với ID ${id}`);
    }
    
    // Verify that the purchase order belongs to the retailer in the header
    if (existingOrder.retailerId.toString() !== retailerId) {
      throw new NotFoundException('Không tìm thấy đơn đặt hàng cho cửa hàng này');
    }
    
    const user = req.user;
    const userDetail = await this.userService.findById(user.id);
    const userIsAdmin = userDetail.role === 'admin';
    const userIsOwner = userDetail.ownedRetailer.some(
      id => id.toString() === retailerId
    );

    // Nếu không phải admin hoặc owner, kiểm tra xem user có quyền truy cập hay không
    if (!userIsAdmin && !userIsOwner) {
      const hasModerator = userDetail.modRetailer.some(
        id => id.toString() === retailerId
      );
      
      if (!hasModerator) {
        throw new NotFoundException(`Không tìm thấy đơn đặt hàng với ID ${id}`);
      }
      
      // Không cho phép xem đơn đã xóa nếu không phải admin/owner
      if (existingOrder.isDeleted) {
        throw new NotFoundException(`Không tìm thấy đơn đặt hàng với ID ${id}`);
      }
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
          select: '_id name unit description category',
        },
        {
          path: 'createdBy',
          select: '_id name email avatar',
        },
        {
          path: 'lastUpdatedBy',
          select: '_id name email avatar',
        },
        {
          path: 'deletedBy',
          select: '_id name email avatar',
        },
      ])
      .exec();

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
    const retailerId = req.headers[RETAILER_ID_HEADER];
    
    if (!retailerId) {
      throw new BadRequestException('RetailerId is required in x-retailer-id header');
    }
    
    const existingOrder = await this.purchaseOrderModel.findById(id).exec();
    if (!existingOrder) {
      throw new NotFoundException('Không tìm thấy đơn đặt hàng');
    }
    
    // Verify that the purchase order belongs to the retailer in the header
    if (existingOrder.retailerId.toString() !== retailerId) {
      throw new NotFoundException('Không tìm thấy đơn đặt hàng cho cửa hàng này');
    }
    
    if (existingOrder.isDeleted) {
      throw new BadRequestException('Không thể cập nhật đơn đặt hàng đã xóa');
    }

    const user = req.user;
    const userDetail = await this.userService.findById(user.id);
    const userIsAdmin = userDetail.role === 'admin';

    // Kiểm tra quyền truy cập
    if (!userIsAdmin) {
      const hasAccess = [...userDetail.ownedRetailer, ...userDetail.modRetailer].some(
        id => id.toString() === retailerId
      );

      if (!hasAccess) {
        throw new ForbiddenException('Bạn không có quyền cập nhật đơn đặt hàng này');
      }
    }

    try {
      // Xử lý thông tin hàng hóa nếu có cập nhật items
      let itemsToUpdate = updatePurchaseOrderDto.items;
      if (itemsToUpdate && itemsToUpdate.length > 0) {
        itemsToUpdate = await this.fillGoodsInfo(itemsToUpdate, req);
      }

      const oldOrder = { ...existingOrder.toObject() };
      
      const updateData = {
        ...updatePurchaseOrderDto,
        ...(itemsToUpdate && { items: itemsToUpdate }),
        lastUpdatedBy: new mongoose.Types.ObjectId(user.id),
      };

      const updatedOrder = await this.purchaseOrderModel
        .findByIdAndUpdate(id, updateData, { new: true })
        .exec();

      if (!updatedOrder) {
        throw new NotFoundException('Không tìm thấy đơn đặt hàng sau khi cập nhật');
      }

      // Tạo audit log
      await this.auditLogsService.createLog({
        retailerId: new mongoose.Types.ObjectId(updatedOrder.retailerId),
        modifiedBy: new mongoose.Types.ObjectId(user.id),
        module: AUDIT_LOG_MODULE_ENUM.PURCHASE_ORDER,
        action: AUDIT_LOG_ACTION_ENUM.UPDATE,
        oldData: oldOrder,
        newData: updatedOrder,
      });

      return updatedOrder;
    } catch (error) {
      console.error('Failed to update purchase order:', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new InternalServerErrorException('Không thể cập nhật đơn đặt hàng');
    }
  }

  /**
   * Xóa mềm đơn đặt hàng (soft delete)
   */
  async remove(id: string, req): Promise<PurchaseOrderDocument> {
    const retailerId = req.headers[RETAILER_ID_HEADER];
    
    if (!retailerId) {
      throw new BadRequestException('RetailerId is required in x-retailer-id header');
    }
    
    const existingOrder = await this.purchaseOrderModel.findById(id).exec();
    if (!existingOrder) {
      throw new NotFoundException('Không tìm thấy đơn đặt hàng');
    }
    
    // Verify that the purchase order belongs to the retailer in the header
    if (existingOrder.retailerId.toString() !== retailerId) {
      throw new NotFoundException('Không tìm thấy đơn đặt hàng cho cửa hàng này');
    }
    
    if (existingOrder.isDeleted) {
      throw new BadRequestException('Đơn đặt hàng đã được xóa trước đó');
    }

    const user = req.user;
    const userDetail = await this.userService.findById(user.id);
    const userIsAdmin = userDetail.role === 'admin';

    // Chỉ owner và admin có quyền xóa
    if (!userIsAdmin) {
      const isOwner = userDetail.ownedRetailer.some(
        id => id.toString() === retailerId
      );

      if (!isOwner) {
        throw new ForbiddenException('Bạn không có quyền xóa đơn đặt hàng này');
      }
    }

    const modifiedBy = user.id;
    const deletedOrder = await this.purchaseOrderModel
      .findByIdAndUpdate(
        id,
        {
          isDeleted: true,
          deletedBy: new mongoose.Types.ObjectId(modifiedBy),
          deletedAt: new Date(),
        },
        { new: true },
      )
      .exec();

    if (!deletedOrder) {
      throw new NotFoundException('Không tìm thấy đơn đặt hàng sau khi xóa');
    }

    // Tạo audit log
    await this.auditLogsService.createLog({
      retailerId: new mongoose.Types.ObjectId(deletedOrder.retailerId),
      modifiedBy: new mongoose.Types.ObjectId(modifiedBy),
      module: AUDIT_LOG_MODULE_ENUM.PURCHASE_ORDER,
      action: AUDIT_LOG_ACTION_ENUM.ARCHIVE,
      oldData: existingOrder,
      newData: deletedOrder,
    });

    return deletedOrder;
  }

  /**
   * Xóa vĩnh viễn đơn đặt hàng (chỉ admin mới có quyền)
   */
  async hardDelete(id: string, req): Promise<PurchaseOrderDocument> {
    const retailerId = req.headers[RETAILER_ID_HEADER];
    
    if (!retailerId) {
      throw new BadRequestException('RetailerId is required in x-retailer-id header');
    }
    
    const existingOrder = await this.purchaseOrderModel.findById(id).exec();
    if (!existingOrder) {
      throw new NotFoundException('Không tìm thấy đơn đặt hàng');
    }
    
    // Verify that the purchase order belongs to the retailer in the header
    if (existingOrder.retailerId.toString() !== retailerId) {
      throw new NotFoundException('Không tìm thấy đơn đặt hàng cho cửa hàng này');
    }

    const user = req.user;
    const userDetail = await this.userService.findById(user.id);
    
    // Chỉ admin mới có quyền xóa vĩnh viễn
    if (userDetail.role !== 'admin') {
      throw new ForbiddenException('Chỉ admin mới có quyền xóa vĩnh viễn đơn đặt hàng');
    }

    const modifiedBy = user.id;
    const deletedOrder = await this.purchaseOrderModel
      .findByIdAndDelete(id)
      .lean()
      .exec();

    if (!deletedOrder) {
      throw new NotFoundException('Không tìm thấy đơn đặt hàng');
    }

    // Tạo audit log
    await this.auditLogsService.createLog({
      retailerId: new mongoose.Types.ObjectId(deletedOrder.retailerId),
      modifiedBy: new mongoose.Types.ObjectId(modifiedBy),
      module: AUDIT_LOG_MODULE_ENUM.PURCHASE_ORDER,
      action: AUDIT_LOG_ACTION_ENUM.HARD_DELETE,
      oldData: existingOrder,
      newData: null,
    });

    return deletedOrder as PurchaseOrderDocument;
  }

  /**
   * Khôi phục đơn đặt hàng đã xóa
   */
  async restore(id: string, req): Promise<PurchaseOrderDocument> {
    const retailerId = req.headers[RETAILER_ID_HEADER];
    
    if (!retailerId) {
      throw new BadRequestException('RetailerId is required in x-retailer-id header');
    }
    
    const existingOrder = await this.purchaseOrderModel.findById(id).exec();
    if (!existingOrder) {
      throw new NotFoundException('Không tìm thấy đơn đặt hàng');
    }
    
    // Verify that the purchase order belongs to the retailer in the header
    if (existingOrder.retailerId.toString() !== retailerId) {
      throw new NotFoundException('Không tìm thấy đơn đặt hàng cho cửa hàng này');
    }
    
    if (!existingOrder.isDeleted) {
      throw new BadRequestException('Đơn đặt hàng không ở trạng thái đã xóa');
    }

    const user = req.user;
    const userDetail = await this.userService.findById(user.id);
    const userIsAdmin = userDetail.role === 'admin';

    // Chỉ owner và admin có quyền khôi phục
    if (!userIsAdmin) {
      const isOwner = userDetail.ownedRetailer.some(
        id => id.toString() === retailerId
      );

      if (!isOwner) {
        throw new ForbiddenException('Bạn không có quyền khôi phục đơn đặt hàng này');
      }
    }

    const modifiedBy = user.id;
    const restoredOrder = await this.purchaseOrderModel
      .findByIdAndUpdate(
        id,
        {
          isDeleted: false,
          deletedBy: null,
          deletedAt: null,
          lastUpdatedBy: new mongoose.Types.ObjectId(modifiedBy),
        },
        { new: true },
      )
      .exec();

    if (!restoredOrder) {
      throw new NotFoundException('Không tìm thấy đơn đặt hàng sau khi khôi phục');
    }

    // Tạo audit log
    await this.auditLogsService.createLog({
      retailerId: new mongoose.Types.ObjectId(restoredOrder.retailerId),
      modifiedBy: new mongoose.Types.ObjectId(modifiedBy),
      module: AUDIT_LOG_MODULE_ENUM.PURCHASE_ORDER,
      action: AUDIT_LOG_ACTION_ENUM.RESTORE,
      oldData: existingOrder,
      newData: restoredOrder,
    });

    return restoredOrder;
  }

  /**
   * Hỗ trợ điền thông tin sản phẩm từ ID
   */
  private async fillGoodsInfo(items: any[], req): Promise<any[]> {
    const retailerId = req.headers[RETAILER_ID_HEADER];
    
    return Promise.all(
      items.map(async (item) => {
        // Nếu có goodId, lấy thông tin từ database
        if (item.goodId) {
          try {
            const good = await this.goodService.findOne(item.goodId, {
              ...req,
              headers: {
                ...req.headers,
                [RETAILER_ID_HEADER]: retailerId
              }
            });
            
            // Nếu không cung cấp tên, lấy từ good
            if (!item.name && good) {
              item.name = good.name;
            }
          
          } catch (error) {
            // Nếu không tìm thấy good, bỏ qua, giữ nguyên dữ liệu đầu vào
            console.log(`Could not find good with ID ${item.goodId}`, error);
          }
        }
        
        // Tính tổng tiền cho mỗi item nếu chưa có
        if (item.price !== undefined && item.quantity !== undefined && item.total === undefined) {
          item.total = item.price * item.quantity;
        }
        
        return item;
      })
    );
  }
} 