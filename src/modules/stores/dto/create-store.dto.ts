import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, IsEnum } from 'class-validator';
import { StoreStatus } from '../models/store.model';

export class CreateStoreDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty({
    enum: StoreStatus,
    default: StoreStatus.DRAFT,
  })
  @IsEnum(StoreStatus)
  status: string;

  @ApiProperty()
  @IsString()
  thumbnail: string;

  @ApiProperty()
  update_at: Date;

  @ApiProperty()
  create_at: Date;
}
