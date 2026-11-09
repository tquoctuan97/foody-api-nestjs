import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import {
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
import { PaginationDto } from 'src/common/pagination/pagination.dto';
import { UserRequest } from '../auth/models/auth.model';
import { hashPassword } from '../auth/utils/hashPassword';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { UserParams } from './models/user.model';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async getAll(query?: UserParams): Promise<PaginationDto<User[]>> {
    const { currentPage, pageSize } = parsePagination(query);

    const queryUser: FilterQuery<User> = {
      name: new RegExp(query?.search || '', 'i'),
      status: new RegExp(query?.status || '', 'i'),
      ...softDeleteFilter(query?.isDeleted),
    };

    const totalCount = await this.userModel.countDocuments(queryUser);

    const data = await this.userModel
      .find(queryUser)
      .sort(query?.sort || '-createdAt')
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize)
      .select('-password')
      .populate(auditUserPopulateOptions())
      .lean<User[]>()
      .exec();

    return buildPaginatedResult(data, totalCount, currentPage, pageSize);
  }

  /** @deprecated use getAll */
  async findAll(query?: UserParams) {
    return this.getAll(query);
  }

  async getOne(id: string): Promise<Partial<User>> {
    const user = await this.userModel
      .findById(id)
      .select('-password')
      .exec();

    if (!user) {
      throw new NotFoundException(`User ${id} is not found`);
    }

    return populateAuditUsers(user);
  }

  async findById(id: string): Promise<Partial<User>> {
    return this.getOne(id);
  }

  async findByEmail(email: string): Promise<User> {
    return this.userModel.findOne({ email, deletedAt: null }).exec();
  }

  async create(actor: UserRequest, createUserDto: CreateUserDto): Promise<User> {
    const isExist = await this.userModel
      .findOne({ email: createUserDto.email })
      .exec();

    if (isExist) {
      throw new Error('Email is already exists');
    }

    const hashedPassword = await hashPassword(createUserDto.password);

    const result = await this.userModel.create({
      ...createUserDto,
      password: hashedPassword,
      ...setCreatedBy(actor.id),
    });

    return populateAuditUsers(result);
  }

  async update(
    actor: UserRequest,
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<User> {
    const hashedPassword = await hashPassword(updateUserDto.password);

    const user = await this.userModel
      .findByIdAndUpdate(
        id,
        {
          ...updateUserDto,
          password: hashedPassword,
          ...setUpdatedBy(actor.id),
        },
        { new: true },
      )
      .select('-password')
      .exec();

    if (!user) {
      throw new NotFoundException(`User ${id} is not found`);
    }

    return populateAuditUsers(user);
  }

  async delete(actor: UserRequest, id: string) {
    const user = await this.userModel.findById(id).select('-password').exec();

    if (!user) {
      throw new NotFoundException(`User ${id} is not found`);
    }

    await user.set(softDeleteAudit(actor.id)).save();

    return user.populate({
      path: 'deletedBy',
      transform: (u: { _id: unknown; name: string }) => ({
        _id: u._id,
        name: u.name,
      }),
    });
  }

  /** @deprecated use delete */
  async remove(actor: UserRequest, id: string) {
    return this.delete(actor, id);
  }
}
