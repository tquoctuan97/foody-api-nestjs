import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';
import { CreatePurchaseOrderDto } from './create-purchase-order.dto';
import { PurchaseOrderStatus } from '../entities/purchase-order.entity';

export class UpdatePurchaseOrderDto extends PartialType(CreatePurchaseOrderDto) {
  @ApiProperty({
    required: false,
    enum: PurchaseOrderStatus,
    description: 'Cập nhật trạng thái đơn hàng',
  })
  @IsOptional()
  @IsEnum(PurchaseOrderStatus)
  status?: PurchaseOrderStatus;
  
  @ApiProperty({
    required: false,
    description: 'ID của khách hàng',
  })
  @IsOptional()
  @IsString()
  @IsMongoId()
  customerId?: string;
} 