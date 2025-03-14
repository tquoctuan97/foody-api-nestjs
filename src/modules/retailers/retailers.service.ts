import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { FilterQuery, Model, Types } from 'mongoose';
import { PaginationDto } from 'src/common/pagination/pagination.dto';
import {
  AUDIT_LOG_ACTION_ENUM,
  AUDIT_LOG_MODULE_ENUM,
} from '../audit-logs/audit-logs.constant';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { UsersService } from '../users/users.service';
import {
  CreateRetailerDto,
  RetailerFilterDto,
  UpdateRetailerDto,
} from './dto/retailer.dto';
import { Retailer, RetailerDocument } from './entities/retailer.entity';

@Injectable()
export class RetailerService {
  constructor(
    @InjectModel(Retailer.name)
    private retailerModel: Model<RetailerDocument>,
    private readonly auditLogsService: AuditLogsService,
    private readonly userService: UsersService,
  ) {}

  async create(createRetailerDto: CreateRetailerDto, req): Promise<Retailer> {
    if (!req.user) throw new NotFoundException('User not found.');

    const ownerId = createRetailerDto.ownerId || req.user.id;
    const modIds = createRetailerDto.modIds || [];

    //check owner can't be in modIds
    if (modIds.includes(ownerId)) {
      throw new BadRequestException('OwnerId can not be in modIds.');
    }
    //check modIds can't be in ownerId
    if (ownerId && modIds.includes(ownerId)) {
      throw new BadRequestException('ModIds can not be in ownerId.');
    }

    const retailer = new this.retailerModel({
      ...createRetailerDto,
      ownerId: new mongoose.Types.ObjectId(ownerId),
      createdBy: new mongoose.Types.ObjectId(req.user.id),
      ...(createRetailerDto?.modIds?.length > 0 && {
        modIds: modIds
          ?.filter((i) => i !== req.user.id)
          ?.map((i) => new mongoose.Types.ObjectId(i)),
      }),
    });
    const modifiedBy = (req as any).user?.id;
    try {
      // Save retailer
      const savedRetailer = await retailer.save();

      // Add owner to retailer
      await this.userService.addRetailerToUser(
        savedRetailer.ownerId,
        savedRetailer._id,
        'owner',
      );

      // Create audit log
      await this.auditLogsService.createLog({
        retailerId: new mongoose.Types.ObjectId(savedRetailer._id),
        modifiedBy: new mongoose.Types.ObjectId(modifiedBy),
        module: AUDIT_LOG_MODULE_ENUM.RETAILER,
        action: AUDIT_LOG_ACTION_ENUM.CREATE,
        oldData: null,
        newData: savedRetailer,
      });

      return savedRetailer;
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('Retailer name must be unique.');
      }

      console.error(error);

      throw new InternalServerErrorException('Failed to create retailer.');
    }
  }

  /**
   * Get paginated retailers with optional filters.
   * @param page - Current page number.
   * @param limit - Number of items per page.
   * @param filters - Additional filters (e.g., ownerId, isDeleted).
   * @returns Paginated result with total count and retailers.
   */
  async findAll(query: RetailerFilterDto, req) {
    const currentPage = parseInt(query?.page) || 1;
    const pageSize = parseInt(query?.pageSize) || 10;

    // const { billDate, billDateFrom, billDateTo } =
    //   this.validateAndParseDates(query);

    const user = (req as any).user;
    const userDetail = await this.userService.findById(user.id);
    const userIsAdmin = userDetail.role === 'admin';

    const queryRetailer: FilterQuery<Retailer> = {
      ...(query?.name && {
        name: { $regex: `^${query?.search?.trim()}$`, $options: 'i' },
      }),
      ...(query?.address && {
        address: { $regex: query.address, $options: 'i' },
      }),
      ...(query?.ownerId && { ownerId: new Types.ObjectId(query?.ownerId) }),
      ...(userIsAdmin
        ? query?.isDeleted !== undefined && { isDeleted: query?.isDeleted }
        : { isDeleted: false }),
      ...(!userIsAdmin && {
        $or: [
          { _id: { $in: userDetail.ownedRetailer } },
          { _id: { $in: userDetail.modRetailer } },
        ],
      }),
      ...(query?.search && {
        $or: [
          { name: { $regex: query.search, $options: 'i' } },
          { address: { $regex: query.search, $options: 'i' } },
        ],
      }),
    };

    const totalCount = await this.retailerModel.countDocuments(queryRetailer);

    const data = await this.retailerModel
      .find(queryRetailer)
      .sort(query?.sort || '-createdAt')
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize)
      .select(userIsAdmin ? '' : '-isDeleted')
      .populate({
        path: 'ownerId',
        select: '_id name email avatar',
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
      .lean<Retailer[]>()
      .exec();

    const response = new PaginationDto<Retailer[]>(data, {
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

  async findOne(id: string, req): Promise<Retailer> {
    const user = (req as any).user;
    const userDetail = await this.userService.findById(user.id);
    const userIsAdmin = userDetail.role === 'admin';

    const retailer = await this.retailerModel
      .findById(new mongoose.Types.ObjectId(id))
      .where({
        ...(userIsAdmin ? {} : { isDeleted: false }),
      })
      .select(userIsAdmin ? '' : '-isDeleted')
      .populate({
        path: 'ownerId',
        select: '_id name email avatar',
      })
      .populate({
        path: 'modIds',
        select: '_id name email avatar',
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
    if (!retailer) {
      throw new NotFoundException(`Retailer with ID ${id} not found`);
    }

    return retailer;
  }

  async update(
    id: string,
    updateRetailerDto: UpdateRetailerDto,
    req,
  ): Promise<Retailer> {
    const existingRetailer = await this.retailerModel.findById(id);
    if (!existingRetailer) {
      throw new NotFoundException('Retailer not found');
    }
    if (existingRetailer.isDeleted) {
      throw new BadRequestException('Retailer is deleted');
    }
    const modifiedBy = (req as any).user?.id;

    const ownerId = updateRetailerDto.ownerId;
    const modIds = updateRetailerDto.modIds || [];

    //check owner can't be in modIds
    if (modIds.includes(ownerId)) {
      throw new BadRequestException('OwnerId can not be in modIds.');
    }
    //check modIds can't be in ownerId
    if (ownerId && modIds.includes(ownerId)) {
      throw new BadRequestException('ModIds can not be in ownerId.');
    }

    const updatedRetailer = await this.retailerModel
      .findByIdAndUpdate(
        id,
        {
          ...updateRetailerDto,
          ...(ownerId && {
            ownerId: new mongoose.Types.ObjectId(ownerId),
          }),
          ...(modIds.length && {
            modIds: modIds.map((mod) => new mongoose.Types.ObjectId(mod)),
          }),
          lastUpdatedBy: new mongoose.Types.ObjectId(modifiedBy),
        },
        { new: true },
      )
      .exec();

    const existingMods = existingRetailer.modIds || [];
    const updatedMods = updatedRetailer.modIds || [];

    if (!updatedRetailer || updatedRetailer.isDeleted) {
      throw new NotFoundException(`Retailer with ID ${id} not found`);
    }

    if (
      existingRetailer.ownerId === null &&
      existingRetailer.ownerId !== updatedRetailer.ownerId
    ) {
      // console.log(
      //   'addRetailerToUser',
      //   existingRetailer.ownerId,
      //   updatedRetailer.ownerId,
      // );

      await this.userService.addRetailerToUser(
        updatedRetailer.ownerId,
        updatedRetailer._id,
        'owner',
      );
    }

    if (
      updatedRetailer.ownerId === null &&
      existingRetailer.ownerId !== updatedRetailer.ownerId
    ) {
      // console.log(
      //   'removeRetailerFromUser',
      //   existingRetailer.ownerId,
      //   updatedRetailer.ownerId,
      // );
      await this.userService.removeRetailerFromUser(
        updatedRetailer.ownerId,
        updatedRetailer._id,
        'owner',
      );
    }

    const deletedMods = existingMods?.filter(
      (mod) => !updatedMods?.includes(mod),
    );
    const addedMods = updatedMods?.filter(
      (mod) => !existingMods?.includes(mod),
    );

    if (deletedMods.length > 0) {
      for (const mod of deletedMods) {
        const user = await this.userService.findById(mod.toString());
        if (!user) {
          throw new NotFoundException(`User with ID ${mod} not found`);
        }
        await this.userService.removeRetailerFromUser(
          mod,
          updatedRetailer._id,
          'moderator',
        );
      }
    }

    if (addedMods.length > 0) {
      for (const mod of addedMods) {
        const user = await this.userService.findById(mod.toString());
        if (!user) {
          throw new NotFoundException(`User with ID ${mod} not found`);
        }
        await this.userService.addRetailerToUser(
          mod,
          updatedRetailer._id,
          'moderator',
        );
      }
    }

    await this.auditLogsService.createLog({
      retailerId: new mongoose.Types.ObjectId(updatedRetailer._id),
      modifiedBy: new mongoose.Types.ObjectId(modifiedBy),
      module: AUDIT_LOG_MODULE_ENUM.RETAILER,
      action: AUDIT_LOG_ACTION_ENUM.UPDATE,
      oldData: existingRetailer,
      newData: updatedRetailer,
    });

    return updatedRetailer;
  }

  async remove(id: string, req): Promise<Retailer> {
    const modifiedBy = (req as any).user?.id;
    //if retailer isDeleted throw error

    const findRetailer = await this.retailerModel
      .findById({
        _id: new mongoose.Types.ObjectId(id),
      })
      .select(['isDeleted'])
      .exec();

    if (findRetailer.isDeleted) {
      throw new BadRequestException('Retailer not deleted');
    }

    const existingRetailer = await this.retailerModel.findById(id);
    
    const updatedRetailer = await this.retailerModel
      .findByIdAndUpdate(
        id,
        {
          isDeleted: true,
          deletedBy: new mongoose.Types.ObjectId(modifiedBy),
          deletedAt: new Date(),
          modIds: [],
          ownerId: null,
        },
        { new: true },
      )
      .exec();
    if (!updatedRetailer) {
      throw new NotFoundException(`Retailer with ID ${id} not found`);
    }

    await this.userService.detachAllRetailersFromUsers(updatedRetailer._id);

    // Get the user's ID from the JWT payload

    await this.auditLogsService.createLog({
      retailerId: new mongoose.Types.ObjectId(id),
      modifiedBy: new mongoose.Types.ObjectId(modifiedBy),
      module: AUDIT_LOG_MODULE_ENUM.RETAILER,
      action: AUDIT_LOG_ACTION_ENUM.DELETE,
      oldData: existingRetailer,
      newData: updatedRetailer,
    });
    return updatedRetailer;
  }

  async unarchive(id: string, req): Promise<Retailer> {
    const modifiedBy = (req as any).user?.id;

    //if retailer isDeleted throw error

    const findRetailer = await this.retailerModel
      .findById({
        _id: new mongoose.Types.ObjectId(id),
      })
      .select(['isDeleted'])
      .exec();

    if (!findRetailer.isDeleted) {
      throw new BadRequestException('Retailer is not deleted');
    }

    const existingRetailer = await this.retailerModel.findById(id);

    const updatedRetailer = await this.retailerModel
      .findByIdAndUpdate(
        id,
        {
          isDeleted: false,
          deletedBy: null,
          deletedAt: null,
          ownerId: new mongoose.Types.ObjectId(modifiedBy),
        },
        { new: true },
      )
      .exec();
    if (!updatedRetailer) {
      throw new NotFoundException(`Retailer with ID ${id} not found`);
    }

    // Get the user's ID from the JWT payload

    await this.auditLogsService.createLog({
      retailerId: new mongoose.Types.ObjectId(id),
      modifiedBy: new mongoose.Types.ObjectId(modifiedBy),
      module: AUDIT_LOG_MODULE_ENUM.RETAILER,
      action: AUDIT_LOG_ACTION_ENUM.RESTORE,
      oldData: existingRetailer,
      newData: updatedRetailer,
    });
    return updatedRetailer;
  }

  async hardDelete(id: string, req): Promise<Retailer> {
    const modifiedBy = (req as any).user?.id;

    const updatedRetailer = await this.retailerModel
      .findByIdAndDelete(id)
      .exec();
    if (!updatedRetailer) {
      throw new NotFoundException(`Retailer with ID ${id} not found`);
    }
    await this.userService.detachAllRetailersFromUsers(id);

    // Get the user's ID from the JWT payload

    await this.auditLogsService.createLog({
      retailerId: new mongoose.Types.ObjectId(id),
      modifiedBy: new mongoose.Types.ObjectId(modifiedBy),
      module: AUDIT_LOG_MODULE_ENUM.RETAILER,
      action: AUDIT_LOG_ACTION_ENUM.HARD_DELETE,
      oldData: updatedRetailer,
      newData: null,
    });
    return updatedRetailer;
  }
}
