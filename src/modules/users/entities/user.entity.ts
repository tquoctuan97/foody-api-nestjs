import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { ActiveSession, Role, UserStatus } from '../models/user.model';

@Schema({ timestamps: true, versionKey: false })
export class User extends Document {
  @ApiProperty()
  @Prop({ required: true, unique: true })
  email: string;

  @ApiProperty()
  @Prop({ required: true })
  password: string;

  // Role

  @ApiProperty()
  @Prop({ enum: Object.values(Role), default: Role.USER })
  role: string;

  @ApiProperty()
  @Prop({ enum: Object.values(UserStatus), default: UserStatus.ACTIVE })
  status: string;

  // Profile

  @ApiProperty()
  @Prop({ required: true })
  name: string;

  @ApiProperty()
  @Prop({ required: false })
  avatar: string;

  @ApiProperty()
  @Prop({ required: false })
  activeSessionList: ActiveSession[];

  //retailer

  @ApiProperty()
  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  ownedRetailer: Types.ObjectId[];

  @ApiProperty()
  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  modRetailer: Types.ObjectId[];
}

export const UserSchema = SchemaFactory.createForClass(User);
