import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './entities/store.entity';
import { Model } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { hashPassword } from '../auth/utils/hashPassword';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }

  async findById(id: string): Promise<User> {
    return this.userModel.findById(id).exec();
  }

  async findByEmail(email: string): Promise<User> {
    return this.userModel.findOne({ email }).exec();
  }

  // async findOne(username: string): Promise<User | undefined> {
  //   return this.users.find((user) => user.username === username);
  // }

  async create(createUserDto: CreateUserDto) {
    const isExist = await this.findByEmail(createUserDto.email);

    if (isExist) {
      throw new Error('Email is already exists');
    }

    const password = await hashPassword(createUserDto.password);

    const result = await this.userModel.create({
      ...createUserDto,
      password,
    });

    return result;
  }

  // async update(id: string, user: User) {
  //   return (this.users[id] = user);
  // }

  // async delete(id: number) {
  //   return this.users.splice(id, 1);
  // }
}
