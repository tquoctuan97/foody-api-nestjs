import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, IsEnum } from 'class-validator';
import { StoreStatus } from '../models/store.model';
import { Location } from '../entities/store.entity';

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
  layout: number;

  @ApiProperty()
  @IsString()
  thumbnail: string;

  @ApiProperty()
  cuisineIds: string[];

  @ApiProperty()
  location: Location;
}
