import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { AuditLog } from './entities/audit-log.entity';
import { AuditLogFilterDto } from './dto/audit-log.dto';
import { PaginationDto } from 'src/common/pagination/pagination.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLog>,
    private readonly userService: UsersService,
  ) {}

  /**
   * Get paginated audit logs with optional filters.
   * @param page - Current page number.
   * @param limit - Number of items per page.
   * @param filters - Additional filters (e.g., retailerId, modifiedBy).
   * @returns Paginated result with total count and logs.
   */
  async _getAuditLogs(
    page = 1,
    limit = 10,
    filters: {
      retailerId?: string;
      modifiedBy?: string;
      action?: string;
      module?: string;
    } = {},
  ): Promise<{
    total: number;
    page: number;
    limit: number;
    logs: AuditLog[];
  }> {
    const query: any = {};

    // Add filters if provided
    if (filters.retailerId) {
      query.retailerId = filters.retailerId;
    }
    if (filters.modifiedBy) {
      query.modifiedBy = filters.modifiedBy;
    }
    if (filters.action) {
      query.action = { $regex: filters.action, $options: 'i' }; // Case-insensitive search
    }
    if (filters.module) {
      query.collectionName = { $regex: filters.module, $options: 'i' }; // Case-insensitive search
    }

    // Calculate total count and fetch logs
    const total = await this.auditLogModel.countDocuments(query);
    const logs = await this.auditLogModel
      .find(query)
      .sort({ modifiedDate: -1 }) // Sort by modifiedDate (latest first)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({ path: 'retailerId', select: '_id name' })
      .populate({ path: 'modifiedBy', select: '_id name email avatar' })
      .exec();

    return {
      total,
      page,
      limit,
      logs,
    };
  }

  async getAuditLogs(query: AuditLogFilterDto, req) {
    const currentPage = parseInt(query?.page) || 1;
    const pageSize = parseInt(query?.pageSize) || 10;

    // const { billDate, billDateFrom, billDateTo } =
    //   this.validateAndParseDates(query);

    // console.log({ req: req.user });
    const user = (req as any).user;
    const userDetail = await this.userService.findById(user.id);

    console.log('getAuditLogs', { userDetail });

    const queryAuditLog: FilterQuery<AuditLog> = {
      ...(query?.action && { action: { $regex: query.action, $options: 'i' } }),
      ...(query?.module && { collectionName: query.module }),
      ...(query?.modifiedBy && {
        modifiedBy: query.modifiedBy,
      }),
      ...(query?.retailerId && {
        retailerId: new Types.ObjectId(query.retailerId),
      }),
      // ...(user.role == 'admin' && {
      //   $or: [
      //     { retailerId: { $in: userDetail.ownedRetailer } },
      //     { retailerId: { $in: userDetail.modRetailer } },
      //   ],
      // }),
    };

    console.log({ queryAuditLog });

    const totalCount = await this.auditLogModel.countDocuments(queryAuditLog);

    const data = await this.auditLogModel
      .find(queryAuditLog)
      .sort(query?.sort || '-createdAt')
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize)
      .select('-newData -oldData')
      .populate({ path: 'retailerId', select: '_id name' })
      .populate({ path: 'modifiedBy', select: '_id name email avatar' })
      .lean<AuditLog[]>()
      .exec();

    const response = new PaginationDto<AuditLog[]>(data, {
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

  async createLog(data: Partial<AuditLog>) {
    return this.auditLogModel.create(data);
  }

  async findOne(id: string): Promise<AuditLog> {
    const auditLog = await this.auditLogModel
      .findById(id)
      .populate({ path: 'retailerId', select: '_id name' })
      .populate({ path: 'modifiedBy', select: '_id name email avatar' })
      .exec();
    if (!auditLog) {
      throw new NotFoundException(`AuditLog with ID ${id} not found`);
    }
    return auditLog;
  }
}
