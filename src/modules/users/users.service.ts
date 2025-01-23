import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PaginationDto } from 'src/common/pagination/pagination.dto';
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

  async findAll(query?: UserParams): Promise<PaginationDto<User[]>> {
    // return this.userModel.find().exec();
    // sort from value of sort query
    // if sort is not provided, sort by createdAt in descending order
    // + for ascending, - for descending
    const currentPage = parseInt(query?.page) || 1;
    const pageSize = parseInt(query?.pageSize) || 10;

    const queryUser = {
      name: new RegExp(query?.search || '', 'i'),
      status: new RegExp(query?.status || '', 'i'),
    };

    const totalCount = await this.userModel.countDocuments(queryUser);

    const data = await this.userModel
      .find(queryUser)
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize)
      .sort(query?.sort || '-createdAt')
      .select(['-password', '-activeSessionList'])
      .lean<User[]>()
      .exec();

    const response = new PaginationDto<User[]>(data, {
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

  async findById(id: string): Promise<Partial<User>> {
    return await this.userModel
      .findById(id)
      .select(['-password', '-activeSessionList'])
      .exec();
  }

  async findByEmail(email: string): Promise<User> {
    return this.userModel.findOne({ email }).exec();
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const isExist = await this.findByEmail(createUserDto.email);

    if (isExist) {
      throw new Error('Email is already exists');
    }

    const hashedPassword = await hashPassword(createUserDto.password);

    const result = await this.userModel.create({
      ...createUserDto,
      password: hashedPassword,
    });

    return result;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const hashedPassword = await hashPassword(updateUserDto.password);

    return this.userModel
      .findByIdAndUpdate(id, {
        ...updateUserDto,
        password: hashedPassword,
      })
      .exec();
  }

  async remove(id: string) {
    return this.userModel.findByIdAndDelete(id);
  }

  //Retailer role
  async canAccessRetailer(
    user: User,
    retailerId: string,
    accessType: 'owner' | 'moderator',
  ): Promise<boolean> {
    if (user.role === 'admin') {
      return true; // Admins have access to all retailers
    }

    const userDetail = await this.userModel.findById(user.id).exec();

    if (!userDetail) {
      return false; // User not found
    }

    const retailerField =
      accessType === 'owner' ? 'ownedRetailer' : 'modRetailer';

    // console.log('canAccessRetailer', {
    //   userDetail,
    //   retailerId,
    //   key: userDetail[retailerField],
    //   can: userDetail[retailerField]?.includes(retailerId),
    // });

    return userDetail[retailerField]?.includes(new Types.ObjectId(retailerId));
  }

  async addRetailerToUser(
    userId: Types.ObjectId | string,
    retailerId: string,
    accessType: 'owner' | 'moderator',
  ): Promise<User> {
    const retailerField =
      accessType === 'owner' ? 'ownedRetailer' : 'modRetailer';

    return this.userModel
      .findByIdAndUpdate(
        userId,
        { $addToSet: { [retailerField]: new Types.ObjectId(retailerId) } }, // Use $addToSet to avoid duplicates
        { new: true },
      )
      .exec();
  }

  async removeRetailerFromUser(
    userId: Types.ObjectId | string,
    retailerId: string,
    accessType: 'owner' | 'moderator',
  ): Promise<User> {
    const retailerField =
      accessType === 'owner' ? 'ownedRetailer' : 'modRetailer';

    return this.userModel
      .findByIdAndUpdate(
        userId,
        { $pull: { [retailerField]: new Types.ObjectId(retailerId) } },
        { new: true },
      )
      .exec();
  }
}
