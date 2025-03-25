import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { PaginationDto } from 'src/common/pagination/pagination.dto';
import {
  CreateCustomerDto,
  CustomerFilterDto,
  UpdateCustomerDto,
} from './dto/customer.dto';
import { Customer, CustomerDocument } from './entities/customer.entity';
import { convertVietnameseToSlug } from 'src/utils';
import { UsersService } from '../users/users.service';
import {
  AUDIT_LOG_ACTION_ENUM,
  AUDIT_LOG_MODULE_ENUM,
} from '../audit-logs/audit-logs.constant';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name)
    private readonly customerModel: Model<CustomerDocument>,
    private readonly userService: UsersService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(
    createCustomerDto: CreateCustomerDto,
    req,
  ): Promise<CustomerDocument> {
    const {
      displayName,
      name,
      phoneNumber = null,
      profileSrc = null,
      retailerId,
    } = createCustomerDto;

    try {
      // Kiểm tra trùng tên
      const existingCustomer = await this.customerModel
        .findOne({
          name: { $regex: `^${name.trim()}$`, $options: 'i' },
          retailerId: new Types.ObjectId(retailerId),
          isDeleted: false,
        })
        .exec();

      if (existingCustomer) {
        throw new ConflictException('Customer name already exists');
      }

      const customer = new this.customerModel({
        displayName,
        name,
        phoneNumber,
        profileSrc,
        slug: convertVietnameseToSlug(name),
        retailerId: new Types.ObjectId(retailerId),
        createdBy: new Types.ObjectId(req.user.id),
      });

      const modifiedBy = req.user.id;
      const savedCustomer = await customer.save();

      // Create audit log
      await this.auditLogsService.createLog({
        retailerId: new Types.ObjectId(savedCustomer.retailerId),
        modifiedBy: new Types.ObjectId(modifiedBy),
        module: AUDIT_LOG_MODULE_ENUM.CUSTOMER,
        action: AUDIT_LOG_ACTION_ENUM.CREATE,
        oldData: null,
        newData: savedCustomer,
      });

      return savedCustomer;
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException(
          'Customer name must be unique for the same retailer.',
        );
      }
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create customer.');
    }
  }

  async findAll(query: CustomerFilterDto, req) {
    const currentPage = parseInt(query?.page?.toString()) || 1;
    const pageSize = parseInt(query?.pageSize?.toString()) || 10;

    const user = req.user;
    const userDetail = await this.userService.findById(user.id);
    const userIsAdmin = userDetail.role === 'admin';
    const userIsOwner =
      query?.retailerId &&
      userDetail.ownedRetailer.some(
        (retailerId) => retailerId.toString() === query?.retailerId?.toString(),
      );

    const queryCustomer: FilterQuery<Customer> = {
      ...(query?.name && {
        name: { $regex: `^${query?.name?.trim()}$`, $options: 'i' },
      }),
      ...(query?.phoneNumber && {
        phoneNumber: { $regex: query.phoneNumber, $options: 'i' },
      }),
      ...(query?.retailerId && {
        retailerId: new Types.ObjectId(query.retailerId),
      }),
      ...(userIsAdmin || userIsOwner
        ? query?.isDeleted !== undefined && { isDeleted: query?.isDeleted }
        : { isDeleted: false }),
      ...(query?.search && {
        $or: [
          {
            slug: {
              $regex: convertVietnameseToSlug(query.search),
              $options: 'i',
            },
          },
        ],
      }),
      ...(!userIsAdmin &&
        !userIsOwner && {
          $and: [
            {
              retailerId: {
                $in: [...userDetail.ownedRetailer, ...userDetail.modRetailer],
              },
            },
            ...(query?.retailerId
              ? [{ retailerId: new Types.ObjectId(query.retailerId) }]
              : []),
          ],
        }),
    };

    const totalCount = await this.customerModel.countDocuments(queryCustomer);

    const data = await this.customerModel
      .find(queryCustomer)
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
      .lean<Customer[]>()
      .exec();

    const response = new PaginationDto<Customer[]>(data, {
      pageSize: pageSize,
      currentPage: currentPage,
      totalPages: Math.ceil(totalCount / pageSize),
      totalCount: totalCount,
      hasNextPage: currentPage < Math.ceil(totalCount / pageSize),
    });

    return response;
  }

  async findOne(id: string, req): Promise<CustomerDocument> {
    const existingCustomer = await this.customerModel
      .findById(new Types.ObjectId(id))
      .exec();
    if (!existingCustomer) {
      throw new NotFoundException('Customer not found');
    }

    const user = req.user;
    const userDetail = await this.userService.findById(user.id);
    const userIsAdmin = userDetail.role === 'admin';
    const userIsOwner = userDetail.ownedRetailer.some(
      (retailerId) =>
        retailerId.toString() === existingCustomer.retailerId.toString(),
    );

    const customer = await this.customerModel
      .findById(id)
      .where(userIsOwner || userIsAdmin ? {} : { isDeleted: false })
      .select(userIsOwner || userIsAdmin ? '' : '-isDeleted')
      .populate(
        (userIsOwner || userIsAdmin) && {
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

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return customer;
  }

  async update(
    id: string,
    updateCustomerDto: UpdateCustomerDto,
    req,
  ): Promise<CustomerDocument> {
    const existingCustomer = await this.customerModel
      .findById(new Types.ObjectId(id))
      .exec();
    if (!existingCustomer) {
      throw new NotFoundException('Customer not found');
    }

    if (existingCustomer.isDeleted) {
      throw new BadRequestException('Customer is deleted');
    }

    const user = req.user;
    const userDetail = await this.userService.findById(user.id);
    const userIsAdmin = userDetail.role === 'admin';

    // Kiểm tra quyền truy cập
    if (!userIsAdmin) {
      const hasAccess = [
        ...userDetail.ownedRetailer,
        ...userDetail.modRetailer,
      ].some(
        (retailerId) =>
          retailerId.toString() === existingCustomer.retailerId.toString(),
      );

      if (!hasAccess) {
        throw new NotFoundException(
          `Customer with ID ${id} not found or you don't have permission to update`,
        );
      }
    }

    // Kiểm tra tên mới có bị trùng không
    if (
      updateCustomerDto.name &&
      updateCustomerDto.name !== existingCustomer.name
    ) {
      const nameExists = await this.customerModel
        .findOne({
          name: { $regex: `^${updateCustomerDto.name.trim()}$`, $options: 'i' },
          retailerId: existingCustomer.retailerId,
          _id: { $ne: existingCustomer._id },
          isDeleted: false,
        })
        .exec();

      if (nameExists) {
        throw new ConflictException('Customer name already exists');
      }
    }

    const modifiedBy = user.id;
    const updateData = {
      ...updateCustomerDto,
      ...(updateCustomerDto.retailerId && {
        retailerId: new Types.ObjectId(updateCustomerDto.retailerId),
      }),
      ...(updateCustomerDto.name && {
        slug: convertVietnameseToSlug(updateCustomerDto.name),
      }),
      lastUpdatedBy: new Types.ObjectId(modifiedBy),
    };

    const updatedCustomer = await this.customerModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();

    if (!updatedCustomer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    await this.auditLogsService.createLog({
      retailerId: new Types.ObjectId(updatedCustomer.retailerId),
      modifiedBy: new Types.ObjectId(modifiedBy),
      module: AUDIT_LOG_MODULE_ENUM.CUSTOMER,
      action: AUDIT_LOG_ACTION_ENUM.UPDATE,
      oldData: existingCustomer,
      newData: updatedCustomer,
    });

    return updatedCustomer;
  }

  async remove(id: string, req): Promise<CustomerDocument> {
    const existingCustomer = await this.customerModel
      .findById(new Types.ObjectId(id))
      .exec();
    if (!existingCustomer) {
      throw new NotFoundException('Customer not found');
    }

    if (existingCustomer.isDeleted) {
      throw new BadRequestException('Customer is already deleted');
    }

    const user = req.user;
    const userDetail = await this.userService.findById(user.id);
    const userIsAdmin = userDetail.role === 'admin';

    // Kiểm tra quyền truy cập
    if (!userIsAdmin) {
      const hasAccess = userDetail.ownedRetailer.some(
        (retailerId) =>
          retailerId.toString() === existingCustomer.retailerId.toString(),
      );

      if (!hasAccess) {
        throw new NotFoundException(
          `Customer with ID ${id} not found or you don't have permission to delete`,
        );
      }
    }

    const modifiedBy = user.id;
    const updatedCustomer = await this.customerModel
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

    if (!updatedCustomer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    await this.auditLogsService.createLog({
      retailerId: new Types.ObjectId(updatedCustomer.retailerId),
      modifiedBy: new Types.ObjectId(modifiedBy),
      module: AUDIT_LOG_MODULE_ENUM.CUSTOMER,
      action: AUDIT_LOG_ACTION_ENUM.DELETE,
      oldData: existingCustomer,
      newData: updatedCustomer,
    });

    return updatedCustomer;
  }

  async hardDelete(id: string, req): Promise<CustomerDocument> {
    const existingCustomer = await this.customerModel
      .findById(new Types.ObjectId(id))
      .exec();
    if (!existingCustomer) {
      throw new NotFoundException('Customer not found');
    }

    const user = req.user;
    const userDetail = await this.userService.findById(user.id);
    const userIsAdmin = userDetail.role === 'admin';

    // Chỉ admin mới có quyền hard delete
    if (!userIsAdmin) {
      throw new BadRequestException('Only admin can perform hard delete');
    }

    const modifiedBy = user.id;
    const deletedCustomer = await this.customerModel
      .findByIdAndDelete(id)
      .lean()
      .exec();

    if (!deletedCustomer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    await this.auditLogsService.createLog({
      retailerId: new Types.ObjectId(deletedCustomer.retailerId),
      modifiedBy: new Types.ObjectId(modifiedBy),
      module: AUDIT_LOG_MODULE_ENUM.CUSTOMER,
      action: AUDIT_LOG_ACTION_ENUM.HARD_DELETE,
      oldData: existingCustomer,
      newData: null,
    });

    return deletedCustomer as CustomerDocument;
  }

  async restore(id: string, req): Promise<CustomerDocument> {
    const existingCustomer = await this.customerModel
      .findById(new Types.ObjectId(id))
      .exec();
    if (!existingCustomer) {
      throw new NotFoundException('Customer not found');
    }

    if (!existingCustomer.isDeleted) {
      throw new BadRequestException('Customer is not deleted');
    }

    const user = req.user;
    const userDetail = await this.userService.findById(user.id);
    const userIsAdmin = userDetail.role === 'admin';

    // Kiểm tra quyền truy cập
    if (!userIsAdmin) {
      const hasAccess = userDetail.ownedRetailer.some(
        (retailerId) =>
          retailerId.toString() === existingCustomer.retailerId.toString(),
      );

      if (!hasAccess) {
        throw new NotFoundException(
          `Customer with ID ${id} not found or you don't have permission to restore`,
        );
      }
    }

    const modifiedBy = user.id;
    const restoredCustomer = await this.customerModel
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

    if (!restoredCustomer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    await this.auditLogsService.createLog({
      retailerId: new Types.ObjectId(restoredCustomer.retailerId),
      modifiedBy: new Types.ObjectId(modifiedBy),
      module: AUDIT_LOG_MODULE_ENUM.CUSTOMER,
      action: AUDIT_LOG_ACTION_ENUM.RESTORE,
      oldData: existingCustomer,
      newData: restoredCustomer,
    });

    return restoredCustomer;
  }
}
