import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Types } from 'mongoose';

export class CreateAttachmentDto {
  @ApiProperty({ description: 'Retailer ID' })
  @IsNotEmpty()
  @IsString()
  retailerId: string;
}

export class AttachmentFilterDto {
  @ApiProperty({ description: 'Retailer ID', required: false })
  @IsOptional()
  @IsMongoId()
  retailerId?: string;

  @ApiProperty({ description: 'Pagination page', required: false })
  @IsOptional()
  page?: number;

  @ApiProperty({ description: 'Pagination limit', required: false })
  @IsOptional()
  limit?: number;

  @ApiProperty({ description: 'Is deleted', required: false })
  @IsOptional()
  isDeleted?: boolean;
}

export class AttachmentResponseDto {
  id: string;
  retailerId: Types.ObjectId;
  originalName: string;
  fileName: string;
  path: string;
  mimeType: string;
  size: number;
  createdAt: Date;
  createdBy: Types.ObjectId;
  fileUrl: string;
  downloadUrl: string;
} 