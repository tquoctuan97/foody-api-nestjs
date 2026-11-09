import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Document, Types } from 'mongoose';
import { User } from 'src/modules/users/entities/user.entity';

@Schema({ timestamps: true, versionKey: false })
export class Customer extends Document {
  @ApiProperty()
  @Prop({ required: true, trim: true })
  name: string;

  @ApiProperty()
  @Prop({ required: true, trim: true })
  displayName: string;

  @ApiPropertyOptional({ nullable: true, type: Number })
  @Prop({ required: false, trim: true, default: null })
  phoneNumber: number | null;

  @ApiProperty({ description: 'Internal slug (excluded from list responses)' })
  @Prop({ required: true })
  slug: string;

  @ApiPropertyOptional()
  @Prop({ type: Types.ObjectId, ref: User.name })
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

export const CustomerSchema = SchemaFactory.createForClass(Customer);
