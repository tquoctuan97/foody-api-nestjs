import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { PaginationDto } from 'src/common/pagination/pagination.dto';
import { UserRequest } from '../auth/models/auth.model';
import { Role } from '../users/models/user.model';
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
    const currentPage = parseInt(query?.page) || 1;
    const pageSize = parseInt(query?.pageSize) || 10;

    const decodedSearch = decodeURI(query?.search || '');

    const queryCustomer: FilterQuery<Customer> = {
      slug: new RegExp(convertVietnameseToSlug(decodedSearch) || '', 'i'),
      ...(query?.isDeleted
        ? { deletedAt: { $ne: null } }
        : { deletedAt: null }),
    };

    const totalCount = await this.customerModel.countDocuments(queryCustomer);

    const data = await this.customerModel
      .find(queryCustomer)
      .sort(query?.sort || '-createdAt')
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize)
      .select('-slug')
      .populate([
        {
          path: 'createdBy',
          transform: (user) => ({
            _id: user._id,
            name: user.name,
          }),
        },
        {
          path: 'updatedBy',
          transform: (user) => ({
            _id: user._id,
            name: user.name,
          }),
        },
        {
          path: 'deletedBy',
          transform: (user) => ({
            _id: user._id,
            name: user.name,
          }),
        },
      ])
      .lean<Customer[]>()
      .exec();

    const response = new PaginationDto<Customer[]>(data, {
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

  async getOne(id: string) {
    const customer = await this.customerModel
      .findById(id)
      .select('-slug')
      .exec();

    if (!customer) {
      throw new NotFoundException(`Customer ${id} is not found`);
    }

    return customer.populate([
      {
        path: 'createdBy',
        transform: (user) => ({
          _id: user._id,
          name: user.name,
        }),
      },
      {
        path: 'updatedBy',
        transform: (user) => ({
          _id: user._id,
          name: user.name,
        }),
      },
      {
        path: 'deletedBy',
        transform: (user) => ({
          _id: user._id,
          name: user.name,
        }),
      },
    ]);
  }

  async checkCustomerNameExist(name: string) {
    const customer = await this.customerModel.findOne({ name }).exec();
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
      createdBy: user.id,
    });

    await newCustomer.save();

    return newCustomer.populate([
      {
        path: 'createdBy',
        transform: (user) => ({
          _id: user._id,
          name: user.name,
        }),
      },
      {
        path: 'updatedBy',
        transform: (user) => ({
          _id: user._id,
          name: user.name,
        }),
      },
      {
        path: 'deletedBy',
        transform: (user) => ({
          _id: user._id,
          name: user.name,
        }),
      },
    ]);
  }

  async update(
    user: UserRequest,
    id: string,
    updateCustomerDto: UpdateCustomerDto,
  ) {
    const customer = await this.getOne(id);

    if (user.role !== Role.ADMIN && customer.createdBy.toString() !== user.id) {
      throw new ForbiddenException(
        'You do not have permission to update this customer',
      );
    }

    if (customer.deletedAt) {
      throw new ForbiddenException("Can't update deleted customer");
    }

    if (customer.name !== updateCustomerDto.name.trim()) {
      await this.checkCustomerNameExist(updateCustomerDto.name);
    }

    await customer
      .set({
        ...updateCustomerDto,
        updatedBy: user.id,
        ...(updateCustomerDto.name && {
          slug: convertVietnameseToSlug(updateCustomerDto.name),
        }),
      })
      .save();

    return customer.populate({
      path: 'updatedBy',
      transform: (user) => ({
        _id: user._id,
        name: user.name,
      }),
    });
  }

  async delete(user: UserRequest, id: string) {
    const customer = await this.getOne(id);

    if (user.role !== Role.ADMIN && customer.createdBy.toString() !== user.id) {
      throw new ForbiddenException(
        'You do not have permission to delete this customer',
      );
    }

    await customer
      .set({
        deletedAt: new Date().toISOString(),
        deletedBy: user.id,
      })
      .save();

    return customer.populate({
      path: 'deletedBy',
      transform: (user) => ({
        _id: user._id,
        name: user.name,
      }),
    });
  }
}
