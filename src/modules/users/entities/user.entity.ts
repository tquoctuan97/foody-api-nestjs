import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiHideProperty, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Document, Types } from 'mongoose';
import { Role, UserStatus } from '../models/user.model';

@Schema({ timestamps: true, versionKey: false })
export class User extends Document {
  @ApiProperty()
  @Prop({ required: true, unique: true })
  email: string;

  @ApiHideProperty()
  @Prop({ required: true })
  password: string;

  @ApiProperty({ enum: Role, default: Role.USER })
  @Prop({ enum: Object.values(Role), default: Role.USER })
  role: string;

  @ApiProperty({ enum: UserStatus, default: UserStatus.ACTIVE })
  @Prop({ enum: Object.values(UserStatus), default: UserStatus.ACTIVE })
  status: string;

  @ApiProperty()
  @Prop({ required: true })
  name: string;

  @ApiPropertyOptional()
  @Prop({ required: false })
  avatar: string;

  @ApiPropertyOptional()
  @Prop({ type: Types.ObjectId, ref: User.name, default: null })
  createdBy: Types.ObjectId;

  @ApiPropertyOptional({ nullable: true })
  @Prop({ type: Types.ObjectId, ref: User.name, default: null })
  updatedBy: Types.ObjectId;

  @ApiPropertyOptional({ nullable: true })
  @Prop({ type: Types.ObjectId, ref: User.name, default: null })
  deletedBy: Types.ObjectId;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  @Prop({ required: false, default: null })
  deletedAt: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  createdAt?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
