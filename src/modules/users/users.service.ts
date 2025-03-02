import { Injectable, Type } from '@nestjs/common';
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

  async checkRole(
    userId: Types.ObjectId | string,
    retailerId: Types.ObjectId | string,
  ) {
    const userDetails = await this.userModel
      .findById(new Types.ObjectId(userId))
      .select(['-password', '-activeSessionList'])
      .exec();
    const canAccessAsAdmin = userDetails.role === 'admin';
    const canAccessAsOwner = userDetails.ownedRetailer.includes(
      new Types.ObjectId(retailerId),
    );
    const canAccessAsMod = userDetails.modRetailer.includes(
      new Types.ObjectId(retailerId),
    );
    const combined = canAccessAsAdmin || canAccessAsOwner || canAccessAsMod;
    return { canAccessAsAdmin, canAccessAsOwner, canAccessAsMod, combined };
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
        new Types.ObjectId(userId),
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

  async detachAllRetailersFromUsers(retailerId: Types.ObjectId | string) {
    //remove retailer from all users -ownedRetailer, modRetailer
    return this.userModel
      .updateMany({
        $pull: {
          ownedRetailer: new Types.ObjectId(retailerId),
          modRetailer: new Types.ObjectId(retailerId),
        },
      })
      .exec();
  }
}
