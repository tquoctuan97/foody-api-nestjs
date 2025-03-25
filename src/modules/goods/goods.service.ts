import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import {
  AUDIT_LOG_MODULE_ENUM,
  AUDIT_LOG_ACTION_ENUM,
} from '../audit-logs/audit-logs.constant';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateGoodDto, GoodFilterDto, UpdateGoodDto } from './dto/goods.dto';
import { Good, GoodDocument } from './entities/goods.entity';
import { UsersService } from '../users/users.service';
import { PaginationDto } from 'src/common/pagination/pagination.dto';
import { RETAILER_ID_HEADER } from '../retailers/retailer-access.guard';

@Injectable()
export class GoodService {
  constructor(
    @InjectModel(Good.name)
    private goodModel: Model<GoodDocument>,
    private readonly auditLogsService: AuditLogsService,
    private readonly userService: UsersService,
  ) {}

  async create(createGoodDto: CreateGoodDto, req): Promise<GoodDocument> {
    const retailerId = req.headers[RETAILER_ID_HEADER];
    
    if (!retailerId) {
      throw new BadRequestException('RetailerId is required in x-retailer-id header');
    }
    
    const good = new this.goodModel({
      ...createGoodDto,
      retailerId: new Types.ObjectId(retailerId),
      createdBy: new Types.ObjectId(req.user.id),
    });
    const modifiedBy = (req as any).user?.id;
    try {
      const savedGood = await good.save();
      // Create audit log
      await this.auditLogsService.createLog({
        retailerId: new Types.ObjectId(savedGood.retailerId),
        modifiedBy: new Types.ObjectId(modifiedBy),
        module: AUDIT_LOG_MODULE_ENUM.GOODS,
        action: AUDIT_LOG_ACTION_ENUM.CREATE,
        oldData: null,
        newData: savedGood,
      });
      return savedGood;
    } catch (error) {
      throw new InternalServerErrorException('Failed to create good.');
    }
  }

  /**
   * Get paginated goods with optional filters.
   * @param page - Current page number.
   * @param limit - Number of items per page.
   * @param filters - Additional filters (e.g., ownerId, isDeleted).
   * @returns Paginated result with total count and goods.
   */
  async _findAll(
    page = 1,
    limit = 10,
    filters: GoodFilterDto = {},
    retailerId: string,
  ): Promise<{
    total: number;
    page: number;
    limit: number;
    data: Good[];
  }> {
    const query: any = { 
      isDeleted: false,
      retailerId: new Types.ObjectId(retailerId)
    };

    // Add filters if provided
    if (filters.name) {
      query.name = { $regex: filters.name, $options: 'i' };
    }
    if (filters.category) {
      query.category = { $regex: filters.category, $options: 'i' };
    }
    
    const skip = (page - 1) * limit;
    const [goods, total] = await Promise.all([
      this.goodModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: 'retailerId', select: '_id name' })
        .exec(),
      this.goodModel.countDocuments(query).exec(),
    ]);
    return {
      total,
      page,
      limit,
      data: goods,
    };
  }

  async findAll(query: GoodFilterDto, req) {
    const currentPage = parseInt(query?.page?.toString()) || 1;
    const pageSize = parseInt(query?.pageSize?.toString()) || 10;
    const retailerId = req.headers[RETAILER_ID_HEADER];
    
    if (!retailerId) {
      throw new BadRequestException('RetailerId is required in x-retailer-id header');
    }

    const user = (req as any).user;
    const userDetail = await this.userService.findById(user.id);
    const userIsAdmin = userDetail.role === 'admin';
    const userIsOwner = userDetail.ownedRetailer.some(
      id => id.toString() === retailerId.toString()
    );

    const queryRetailer: FilterQuery<Good> = {
      retailerId: new Types.ObjectId(retailerId),
      ...(query?.name && {
        name: { $regex: `^${query?.name?.trim()}$`, $options: 'i' },
      }),
      ...(query?.category && {
        category: { $regex: query.category, $options: 'i' },
      }),
      ...(userIsAdmin || userIsOwner
        ? query?.isDeleted !== undefined && { isDeleted: query?.isDeleted }
        : { isDeleted: false }),
      ...(query?.search && {
        $or: [
          { name: { $regex: query.search, $options: 'i' } },
          { category: { $regex: query.search, $options: 'i' } },
        ],
      }),
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
          { retailerId: new Types.ObjectId(retailerId) }
        ]
      }),
    };

    const totalCount = await this.goodModel.countDocuments(queryRetailer);

    const data = await this.goodModel
      .find(queryRetailer)
      .sort(query?.sort || '-createdAt')
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize)
      .select(userIsAdmin || userIsOwner ? '' : '-isDeleted')
      .populate(
        (userIsAdmin || userIsOwner) && {
          path: 'retailerId',
          select: '_id name',
        },
      )
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
      .lean<Good[]>()
      .exec();

    const response = new PaginationDto<Good[]>(data, {
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

  async findOne(id: string, req): Promise<GoodDocument> {
    const retailerId = req.headers[RETAILER_ID_HEADER];
    
    if (!retailerId) {
      throw new BadRequestException('RetailerId is required in x-retailer-id header');
    }
    
    const existingGood = await this.goodModel.findById(new Types.ObjectId(id)).exec();
    if (!existingGood) {
      throw new NotFoundException('Good not found');
    }
    
    // Verify that the good belongs to the retailer in the header
    if (existingGood.retailerId.toString() !== retailerId.toString()) {
      throw new NotFoundException('Good not found for this retailer');
    }
    
    const user = (req as any).user;
    const userDetail = await this.userService.findById(user.id);
    const userIsAdmin = userDetail.role === 'admin';
    const userIsOwner = userDetail.ownedRetailer.some(
      id => id.toString() === existingGood.retailerId.toString()
    );

    const good = await this.goodModel
      .findById(id)
      .where((userIsOwner || userIsAdmin) ? {} : { isDeleted: false })
      .select(userIsAdmin || userIsOwner ? '' : '-isDeleted')
      .populate(
        (userIsAdmin || userIsOwner) && {
          path: 'retailerId',
          select: '_id name',
        },
      )
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
    
    if (!good) {
      throw new NotFoundException(`Good with ID ${id} not found`);
    }
    
    return good;
  }

  async update(
    id: string,
    updateGoodDto: UpdateGoodDto,
    req,
  ): Promise<GoodDocument> {
    const retailerId = req.headers[RETAILER_ID_HEADER];
    
    if (!retailerId) {
      throw new BadRequestException('RetailerId is required in x-retailer-id header');
    }
    
    try {
      const existingGood = await this.goodModel.findById(id).exec();
      if (!existingGood) {
        throw new NotFoundException('Good not found');
      }
      
      // Verify that the good belongs to the retailer in the header
      if (existingGood.retailerId.toString() !== retailerId.toString()) {
        throw new NotFoundException('Good not found for this retailer');
      }

      const modifiedBy = (req as any).user?.id;

      const oldGood = { ...existingGood.toObject() };

      const updateData = {
        ...updateGoodDto,
        lastUpdatedBy: new Types.ObjectId(modifiedBy),
      };

      const updatedGood = await this.goodModel
        .findByIdAndUpdate(id, updateData, { new: true })
        .exec();

      // Create audit log
      await this.auditLogsService.createLog({
        retailerId: new Types.ObjectId(updatedGood.retailerId),
        modifiedBy: new Types.ObjectId(modifiedBy),
        module: AUDIT_LOG_MODULE_ENUM.GOODS,
        action: AUDIT_LOG_ACTION_ENUM.UPDATE,
        oldData: oldGood,
        newData: updatedGood,
      });

      return updatedGood;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      console.error('Failed to update good:', error);

      throw new InternalServerErrorException('Failed to update good.');
    }
  }

  async remove(id: string, req): Promise<GoodDocument> {
    const retailerId = req.headers[RETAILER_ID_HEADER];
    
    if (!retailerId) {
      throw new BadRequestException('RetailerId is required in x-retailer-id header');
    }
    
    const existingGood = await this.goodModel.findById(new Types.ObjectId(id)).exec();
    if (!existingGood) {
      throw new NotFoundException('Good not found');
    }
    
    // Verify that the good belongs to the retailer in the header
    if (existingGood.retailerId.toString() !== retailerId.toString()) {
      throw new NotFoundException('Good not found for this retailer');
    }
    
    if (existingGood.isDeleted) {
      throw new BadRequestException('Good is already deleted');
    }
    
    const user = (req as any).user;
    const userDetail = await this.userService.findById(user.id);
    const userIsAdmin = userDetail.role === 'admin';

    // Kiểm tra quyền truy cập
    if (!userIsAdmin) {
      const hasAccess = userDetail.ownedRetailer.some(
        id => id.toString() === existingGood.retailerId.toString()
      );

      if (!hasAccess) {
        throw new NotFoundException(`Good with ID ${id} not found or you don't have permission to delete`);
      }
    }

    // Get the user's ID from the JWT payload
    const modifiedBy = user.id;
    const updatedGood = await this.goodModel
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
    
    if (!updatedGood) {
      throw new NotFoundException(`Good with ID ${id} not found`);
    }

    await this.auditLogsService.createLog({
      retailerId: new Types.ObjectId(updatedGood.retailerId),
      modifiedBy: new Types.ObjectId(modifiedBy),
      module: AUDIT_LOG_MODULE_ENUM.GOODS,
      action: AUDIT_LOG_ACTION_ENUM.ARCHIVE,
      oldData: existingGood,
      newData: updatedGood,
    });
    
    return updatedGood;
  }

  async hardDelete(id: string, req): Promise<GoodDocument> {
    const retailerId = req.headers[RETAILER_ID_HEADER];
    
    if (!retailerId) {
      throw new BadRequestException('RetailerId is required in x-retailer-id header');
    }
    
    const existingGood = await this.goodModel.findById(new Types.ObjectId(id)).exec();
    if (!existingGood) {
      throw new NotFoundException('Good not found');
    }
    
    // Verify that the good belongs to the retailer in the header
    if (existingGood.retailerId.toString() !== retailerId.toString()) {
      throw new NotFoundException('Good not found for this retailer');
    }
    
    const user = (req as any).user;
    const userDetail = await this.userService.findById(user.id);
    const userIsAdmin = userDetail.role === 'admin';

    // Chỉ admin mới có quyền hard delete
    if (!userIsAdmin) {
      throw new BadRequestException('Only admin can perform hard delete');
    }

    const modifiedBy = user.id;
    const deletedGood = await this.goodModel
      .findByIdAndDelete(id)
      .lean()
      .exec();
    
    if (!deletedGood) {
      throw new NotFoundException(`Good with ID ${id} not found`);
    }

    await this.auditLogsService.createLog({
      retailerId: new Types.ObjectId(deletedGood.retailerId),
      modifiedBy: new Types.ObjectId(modifiedBy),
      module: AUDIT_LOG_MODULE_ENUM.GOODS,
      action: AUDIT_LOG_ACTION_ENUM.HARD_DELETE,
      oldData: existingGood,
      newData: null,
    });
    
    return deletedGood as GoodDocument;
  }

  async restore(id: string, req): Promise<GoodDocument> {
    const retailerId = req.headers[RETAILER_ID_HEADER];
    
    if (!retailerId) {
      throw new BadRequestException('RetailerId is required in x-retailer-id header');
    }
    
    const existingGood = await this.goodModel.findById(new Types.ObjectId(id)).exec();
    if (!existingGood) {
      throw new NotFoundException('Good not found');
    }
    
    // Verify that the good belongs to the retailer in the header
    if (existingGood.retailerId.toString() !== retailerId.toString()) {
      throw new NotFoundException('Good not found for this retailer');
    }
    
    if (!existingGood.isDeleted) {
      throw new BadRequestException('Good is not deleted');
    }
    
    const user = (req as any).user;
    const userDetail = await this.userService.findById(user.id);
    const userIsAdmin = userDetail.role === 'admin';

    // Kiểm tra quyền truy cập
    if (!userIsAdmin) {
      const hasAccess = userDetail.ownedRetailer.some(
        id => id.toString() === existingGood.retailerId.toString()
      );

      if (!hasAccess) {
        throw new NotFoundException(`Good with ID ${id} not found or you don't have permission to restore`);
      }
    }

    const modifiedBy = user.id;
    const restoredGood = await this.goodModel
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
      .exec()
    
    if (!restoredGood) {
      throw new NotFoundException(`Good with ID ${id} not found`);
    }

    await this.auditLogsService.createLog({
      retailerId: new Types.ObjectId(restoredGood.retailerId),
      modifiedBy: new Types.ObjectId(modifiedBy),
      module: AUDIT_LOG_MODULE_ENUM.GOODS,
      action: AUDIT_LOG_ACTION_ENUM.RESTORE,
      oldData: existingGood,
      newData: restoredGood,
    });
    
    return restoredGood;
  }
}
