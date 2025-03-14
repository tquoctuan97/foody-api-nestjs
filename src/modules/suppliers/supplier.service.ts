import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { FilterQuery, Model } from 'mongoose';
import {
  AUDIT_LOG_ACTION_ENUM,
  AUDIT_LOG_MODULE_ENUM,
} from '../audit-logs/audit-logs.constant';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  CreateSupplierDto,
  SupplierFilterDto,
  UpdateSupplierDto,
} from './dto/supplier.dto';
import { Supplier, SupplierDocument } from './entities/supplier.entity';
import { UsersService } from '../users/users.service';
import { PaginationDto } from 'src/common/pagination/pagination.dto';
import { RetailerService } from '../retailers/retailers.service';

@Injectable()
export class SupplierService {
  constructor(
    @InjectModel(Supplier.name)
    private supplierModel: Model<SupplierDocument>,
    private readonly auditLogsService: AuditLogsService,
    private readonly userService: UsersService,
    private readonly retailerService: RetailerService,
  ) {}

  async create(
    createSupplierDto: CreateSupplierDto,
    req,
  ): Promise<SupplierDocument> {
    const supplier = new this.supplierModel({
      ...createSupplierDto,
      retailerId: new mongoose.Types.ObjectId(createSupplierDto.retailerId),
      createdBy: new mongoose.Types.ObjectId(req.user.id),
    });
    const modifiedBy = (req as any).user?.id;
    try {
      // Save supplier
      const savedSupplier = await supplier.save();

      // Create audit log
      await this.auditLogsService.createLog({
        retailerId: new mongoose.Types.ObjectId(savedSupplier.retailerId),
        modifiedBy: new mongoose.Types.ObjectId(modifiedBy),
        module: AUDIT_LOG_MODULE_ENUM.SUPPLIER,
        action: AUDIT_LOG_ACTION_ENUM.CREATE,
        oldData: null,
        newData: savedSupplier,
      });

      return savedSupplier;
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('Supplier name must be unique.');
      }

      console.error('Failed to create supplier:', error);

      throw new InternalServerErrorException('Failed to create supplier.');
    }
  }

  /**
   * Get paginated suppliers with optional filters.
   * @param page - Current page number.
   * @param limit - Number of items per page.
   * @param filters - Additional filters (e.g., ownerId, isDeleted).
   * @returns Paginated result with total count and suppliers.
   */
  async findAll(query: SupplierFilterDto, req) {
    const currentPage = parseInt(query?.page?.toString()) || 1;
    const pageSize = parseInt(query?.pageSize?.toString()) || 10;

    const user = (req as any).user;
    const userDetail = await this.userService.findById(user.id);
    const userIsAdmin = userDetail.role === 'admin';

    const queryRetailer: FilterQuery<Supplier> = {
      ...(query?.name && {
        name: { $regex: `^${query?.name?.trim()}$`, $options: 'i' },
      }),
      ...(query?.phoneNumber && {
        phoneNumber: { $regex: query.phoneNumber, $options: 'i' },
      }),
      ...(query?.retailerId && {
        retailerId: new mongoose.Types.ObjectId(query.retailerId),
      }),
      ...(userIsAdmin
        ? query?.isDeleted !== undefined && { isDeleted: query?.isDeleted }
        : { isDeleted: false }),
      ...(query?.search && {
        $or: [
          { name: { $regex: query.search, $options: 'i' } },
          { phoneNumber: { $regex: query.search, $options: 'i' } },
        ],
      }),
      ...(!userIsAdmin && {
        retailerId: {
          $in: [
            ...userDetail.ownedRetailer,
            ...userDetail.modRetailer,
          ],
        },
      }),
    };

    const totalCount = await this.supplierModel.countDocuments(queryRetailer);

    const data = await this.supplierModel
      .find(queryRetailer)
      .sort(query?.sort || '-createdAt')
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize)
      .select(userIsAdmin ? '' : '-isDeleted')
      .populate(
        userIsAdmin && {
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
      .lean<Supplier[]>()
      .exec();

    const response = new PaginationDto<Supplier[]>(data, {
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

  async findOne(id: string, req): Promise<SupplierDocument> {
    const user = (req as any).user;
    const userDetail = await this.userService.findById(user.id);
    const userIsAdmin = userDetail.role === 'admin';

    // Kiểm tra quyền truy cập
    if (!userIsAdmin) {
      const supplier = await this.supplierModel.findById(id).lean().exec();
      if (!supplier) {
        throw new NotFoundException(`Supplier with ID ${id} not found`);
      }

      const hasAccess = [...userDetail.ownedRetailer, ...userDetail.modRetailer].some(
        retailerId => retailerId.toString() === supplier.retailerId.toString()
      );

      if (!hasAccess) {
        throw new NotFoundException(`Supplier with ID ${id} not found or you don't have permission`);
      }
    }

    const supplier = await this.supplierModel
      .findById(id)
      .where(userIsAdmin ? {} : { isDeleted: false })
      .select(userIsAdmin ? '' : '-isDeleted')
      .populate(
        userIsAdmin && {
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
    
    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }
    
    return supplier;
  }

  async update(
    id: string,
    updateSupplierDto: UpdateSupplierDto,
    req,
  ): Promise<SupplierDocument> {
    const existingSupplier = await this.supplierModel.findById(id).exec();
    if (!existingSupplier) {
      throw new NotFoundException('Supplier not found');
    }
    
    if (existingSupplier.isDeleted) {
      throw new BadRequestException('Supplier is deleted');
    }

    const user = (req as any).user;
    const userDetail = await this.userService.findById(user.id);
    const userIsAdmin = userDetail.role === 'admin';

    // Kiểm tra quyền truy cập
    if (!userIsAdmin) {
      const hasAccess = userDetail.ownedRetailer.some(
        retailerId => retailerId.toString() === existingSupplier.retailerId.toString()
      );

      if (!hasAccess) {
        throw new NotFoundException(`Supplier with ID ${id} not found or you don't have permission to update`);
      }
    }

    const modifiedBy = user.id;
    const updatedSupplier = await this.supplierModel
      .findByIdAndUpdate(
        id,
        {
          ...updateSupplierDto,
          ...(updateSupplierDto.retailerId && {
            retailerId: new mongoose.Types.ObjectId(
              updateSupplierDto.retailerId,
            ),
          }),
          lastUpdatedBy: new mongoose.Types.ObjectId(modifiedBy),
        },
        { new: true },
      )
      .exec();
    
    if (!updatedSupplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    await this.auditLogsService.createLog({
      retailerId: new mongoose.Types.ObjectId(updatedSupplier.retailerId),
      modifiedBy: new mongoose.Types.ObjectId(modifiedBy),
      module: AUDIT_LOG_MODULE_ENUM.SUPPLIER,
      action: AUDIT_LOG_ACTION_ENUM.UPDATE,
      oldData: existingSupplier,
      newData: updatedSupplier,
    });

    return updatedSupplier;
  }

  async remove(id: string, req): Promise<SupplierDocument> {
    const existingSupplier = await this.supplierModel.findById(id).exec();
    if (!existingSupplier) {
      throw new NotFoundException('Supplier not found');
    }
    
    if (existingSupplier.isDeleted) {
      throw new BadRequestException('Supplier is already deleted');
    }

    const user = (req as any).user;
    const userDetail = await this.userService.findById(user.id);
    const userIsAdmin = userDetail.role === 'admin';

    // Kiểm tra quyền truy cập
    if (!userIsAdmin) {
      const hasAccess = userDetail.ownedRetailer.some(
        retailerId => retailerId.toString() === existingSupplier.retailerId.toString()
      );

      if (!hasAccess) {
        throw new NotFoundException(`Supplier with ID ${id} not found or you don't have permission to delete`);
      }
    }

    // Get the user's ID from the JWT payload
    const modifiedBy = user.id;
    const updatedSupplier = await this.supplierModel
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
    
    if (!updatedSupplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    await this.auditLogsService.createLog({
      retailerId: new mongoose.Types.ObjectId(updatedSupplier.retailerId),
      modifiedBy: new mongoose.Types.ObjectId(modifiedBy),
      module: AUDIT_LOG_MODULE_ENUM.SUPPLIER,
      action: AUDIT_LOG_ACTION_ENUM.DELETE,
      oldData: existingSupplier,
      newData: updatedSupplier,
    });
    
    return updatedSupplier;
  }

  async hardDelete(id: string, req): Promise<SupplierDocument> {
    const existingSupplier = await this.supplierModel.findById(id).exec();
    if (!existingSupplier) {
      throw new NotFoundException('Supplier not found');
    }

    const user = (req as any).user;
    const userDetail = await this.userService.findById(user.id);
    const userIsAdmin = userDetail.role === 'admin';

    // Chỉ admin mới có quyền hard delete
    if (!userIsAdmin) {
      throw new BadRequestException('Only admin can perform hard delete');
    }

    const modifiedBy = user.id;
    const deletedSupplier = await this.supplierModel
      .findByIdAndDelete(id)
      .lean()
      .exec();
    
    if (!deletedSupplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    await this.auditLogsService.createLog({
      retailerId: new mongoose.Types.ObjectId(deletedSupplier.retailerId),
      modifiedBy: new mongoose.Types.ObjectId(modifiedBy),
      module: AUDIT_LOG_MODULE_ENUM.SUPPLIER,
      action: AUDIT_LOG_ACTION_ENUM.HARD_DELETE,
      oldData: existingSupplier,
      newData: null,
    });
    
    return deletedSupplier as SupplierDocument;
  }

  async restore(id: string, req): Promise<SupplierDocument> {
    const existingSupplier = await this.supplierModel.findById(id).exec();
    if (!existingSupplier) {
      throw new NotFoundException('Supplier not found');
    }
    
    if (!existingSupplier.isDeleted) {
      throw new BadRequestException('Supplier is not deleted');
    }

    const user = (req as any).user;
    const userDetail = await this.userService.findById(user.id);
    const userIsAdmin = userDetail.role === 'admin';

    // Kiểm tra quyền truy cập
    if (!userIsAdmin) {
      const hasAccess = userDetail.ownedRetailer.some(
        retailerId => retailerId.toString() === existingSupplier.retailerId.toString()
      );

      if (!hasAccess) {
        throw new NotFoundException(`Supplier with ID ${id} not found or you don't have permission to restore`);
      }
    }

    const modifiedBy = user.id;
    const restoredSupplier = await this.supplierModel
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
    
    if (!restoredSupplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    await this.auditLogsService.createLog({
      retailerId: new mongoose.Types.ObjectId(restoredSupplier.retailerId),
      modifiedBy: new mongoose.Types.ObjectId(modifiedBy),
      module: AUDIT_LOG_MODULE_ENUM.SUPPLIER,
      action: AUDIT_LOG_ACTION_ENUM.RESTORE,
      oldData: existingSupplier,
      newData: restoredSupplier,
    });
    
    return restoredSupplier;
  }
}
