import {
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

@Injectable()
export class SupplierService {
  constructor(
    @InjectModel(Supplier.name)
    private supplierModel: Model<SupplierDocument>,
    private readonly auditLogsService: AuditLogsService,
    private readonly userService: UsersService,
  ) {}

  async create(
    createSupplierDto: CreateSupplierDto,
    req,
  ): Promise<SupplierDocument> {
    const supplier = new this.supplierModel({
      ...createSupplierDto,
      retailerId: new mongoose.Types.ObjectId(createSupplierDto.retailerId),
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
  async _findAll(
    page = 1,
    limit = 10,
    filters: SupplierFilterDto = {},
  ): Promise<{
    total: number;
    page: number;
    limit: number;
    data: Supplier[];
  }> {
    const query: any = { isDeleted: false };

    // Add filters if provided
    if (filters.name) {
      query.name = { $regex: filters.name, $options: 'i' };
    }
    if (filters.retailerId) {
      query.retailerId = filters.retailerId;
    }

    // Calculate total count and fetch suppliers
    const total = await this.supplierModel.countDocuments(query);
    const data = await this.supplierModel
      .find(query)
      .sort({ createdAt: -1 }) // Sort by createdAt (latest first)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({ path: 'retailerId', select: '_id name' })
      .exec();

    return {
      total,
      page,
      limit,
      data,
    };
  }
  async findAll(query: SupplierFilterDto, req) {
    const currentPage = parseInt(query?.page) || 1;
    const pageSize = parseInt(query?.pageSize) || 10;

    // const { billDate, billDateFrom, billDateTo } =
    //   this.validateAndParseDates(query);

    const user = (req as any).user;
    const userDetail = await this.userService.findById(user.id);

    const queryRetailer: FilterQuery<Supplier> = {
      ...(query?.name && { name: { $regex: query.name, $options: 'i' } }),
      ...(query?.isDeleted
        ? { deletedAt: { $ne: null } }
        : { deletedAt: null }),
      ...(userDetail.role !== 'admin' && {
        $or: [
          { retailerId: { $in: userDetail.ownedRetailer } },
          { retailerId: { $in: userDetail.modRetailer } },
        ],
      }),
    };

    const totalCount = await this.supplierModel.countDocuments(queryRetailer);

    const data = await this.supplierModel
      .find(queryRetailer)
      .sort(query?.sort || '-createdAt')
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize)
      .select('-isDeleted')
      .populate({ path: 'retailerId', select: '_id name' })
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
  async findOne(id: string): Promise<SupplierDocument> {
    const supplier = await this.supplierModel
      .findById(id)
      .populate({ path: 'retailerId', select: '_id name' })
      .exec();
    if (!supplier || supplier.isDeleted) {
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
        },
        { new: true },
      )
      .exec();
    if (!updatedSupplier || updatedSupplier.isDeleted) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }
    const modifiedBy = (req as any).user?.id;

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
    const updatedSupplier = await this.supplierModel
      .findByIdAndUpdate(id, { isDeleted: true }, { new: true })
      .exec();
    if (!updatedSupplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    // Get the user's ID from the JWT payload
    const modifiedBy = (req as any).user?.id;

    await this.auditLogsService.createLog({
      retailerId: new mongoose.Types.ObjectId(updatedSupplier.retailerId),
      modifiedBy: new mongoose.Types.ObjectId(modifiedBy),
      module: AUDIT_LOG_MODULE_ENUM.SUPPLIER,
      action: AUDIT_LOG_ACTION_ENUM.DELETE,
      oldData: updatedSupplier,
      newData: null,
    });
    return updatedSupplier;
  }
}
