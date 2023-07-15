import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  MinLength,
  IsEnum,
  IsEmail,
  MaxLength,
} from 'class-validator';
import { Role, UserStatus } from '../models/user.model';

export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  password: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  name: string;

  @ApiProperty()
  avatar: string;

  @ApiProperty({
    enum: Role,
    default: Role.USER,
  })
  @IsEnum(Role)
  role: string;

  @ApiProperty({
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  @IsEnum(UserStatus)
  status: string;
}
