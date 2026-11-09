import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import {
  assertNotSoftDeleted,
  assertOwnerOrAdmin,
  auditUserPopulateOptions,
  populateAuditUsers,
  setCreatedBy,
  setUpdatedBy,
  softDeleteAudit,
} from 'src/common/audit/audit-user';
import {
  buildPaginatedResult,
  parsePagination,
  softDeleteFilter,
} from 'src/common/pagination/paginate';
import { UserRequest } from '../auth/models/auth.model';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer } from './entities/customer.entity';
import { CustomerParams } from './models/customer.model';
import { convertVietnameseToSlug } from 'src/utils';

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name) private readonly customerModel: Model<Customer>,
  ) {}

  async getAll(query: CustomerParams) {
    const { currentPage, pageSize } = parsePagination(query);

    const queryCustomer: FilterQuery<Customer> = {
      slug: new RegExp(convertVietnameseToSlug(query?.search) || '', 'i'),
      ...softDeleteFilter(query?.isDeleted),
    };

    const totalCount = await this.customerModel.countDocuments(queryCustomer);

    const data = await this.customerModel
      .find(queryCustomer)
      .sort(query?.sort || '-createdAt')
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize)
      .select('-slug')
      .populate(auditUserPopulateOptions())
      .lean<Customer[]>()
      .exec();

    return buildPaginatedResult(data, totalCount, currentPage, pageSize);
  }

  async getOne(id: string) {
    const customer = await this.customerModel.findById(id).select('-slug').exec();

    if (!customer) {
      throw new NotFoundException(`Customer ${id} is not found`);
    }

    return populateAuditUsers(customer);
  }

  async checkCustomerNameExist(name: string) {
    const customer = await this.customerModel
      .findOne({ name, deletedAt: null })
      .exec();
    if (customer) {
      throw new BadRequestException('Customer name already exists');
    }
  }

  async create(user: UserRequest, createCustomerDto: CreateCustomerDto) {
    const { displayName, name, phoneNumber = null } = createCustomerDto;

    await this.checkCustomerNameExist(name);

    const newCustomer = new this.customerModel({
      displayName,
      name,
      phoneNumber,
      slug: convertVietnameseToSlug(name),
      ...setCreatedBy(user.id),
    });

    await newCustomer.save();

    return populateAuditUsers(newCustomer);
  }

  async update(
    user: UserRequest,
    id: string,
    updateCustomerDto: UpdateCustomerDto,
  ) {
    const customer = await this.customerModel.findById(id).select('-slug').exec();

    if (!customer) {
      throw new NotFoundException(`Customer ${id} is not found`);
    }

    assertOwnerOrAdmin(user, customer.createdBy, 'update this customer');
    assertNotSoftDeleted(customer.deletedAt, 'customer');

    if (
      updateCustomerDto.name &&
      customer.name !== updateCustomerDto.name.trim()
    ) {
      await this.checkCustomerNameExist(updateCustomerDto.name);
    }

    await customer
      .set({
        ...updateCustomerDto,
        ...setUpdatedBy(user.id),
        ...(updateCustomerDto.name && {
          slug: convertVietnameseToSlug(updateCustomerDto.name),
        }),
      })
      .save();

    return customer.populate(auditUserPopulateOptions());
  }

  async delete(user: UserRequest, id: string) {
    const customer = await this.customerModel.findById(id).select('-slug').exec();

    if (!customer) {
      throw new NotFoundException(`Customer ${id} is not found`);
    }

    assertOwnerOrAdmin(user, customer.createdBy, 'delete this customer');

    await customer.set(softDeleteAudit(user.id)).save();

    return customer.populate({
      path: 'deletedBy',
      transform: (u: { _id: Types.ObjectId; name: string }) => ({
        _id: u._id,
        name: u.name,
      }),
    });
  }
}
