import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  Min,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { PurchaseOrderStatus } from '../entities/purchase-order.entity';

export class PurchaseOrderItemDto {
  @ApiProperty({
    required: false,
    description: 'ID của sản phẩm (từ mô-đun Goods)',
    example: '64a5e4e2b0c80e5c9c684f7b'
  })
  @IsOptional()
  @IsMongoId()
  goodId?: string;

  @ApiProperty({
    required: false,
    description: 'Tên sản phẩm (sẽ tự động lấy từ Good nếu có goodId, không cần nhập)',
    example: 'Sản phẩm A'
  })
  @IsOptional()
  @ValidateIf(o => !o.goodId)
  @IsNotEmpty({ message: 'Tên sản phẩm là bắt buộc nếu không có goodId' })
  @IsString()
  name?: string;

  @ApiProperty({
    required: false,
    description: 'Giá đơn vị (nếu không cung cấp và có goodId, sẽ tự lấy từ Good)',
  })
  @IsOptional()
  @ValidateIf(o => !o.goodId)
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiProperty({
    required: true,
    description: 'Số lượng',
  })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({
    required: false,
    description: 'Tổng tiền (price * quantity, sẽ được tự động tính nếu không cung cấp)',
  })
  @IsOptional()
  @IsNumber()
  total?: number;
}

export class AdjustmentItemDto {
  @ApiProperty({
    required: true,
    description: 'Tên khoản điều chỉnh',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ 
    required: true, 
    enum: ['add', 'subtract'],
    description: 'Loại điều chỉnh: thêm hoặc bớt'
  })
  @IsEnum(['add', 'subtract'], { message: 'Type must be "add" or "subtract"' })
  type: 'add' | 'subtract';

  @ApiProperty({ 
    required: true,
    description: 'Số tiền điều chỉnh' 
  })
  @IsNumber()
  @Min(0)
  amount: number;
}

export class CreatePurchaseOrderDto {
  @ApiProperty({ 
    required: true, 
    type: Date,
    description: 'Ngày đặt hàng' 
  })
  @IsDate()
  @Type(() => Date)
  orderDate: Date;

  @ApiProperty({
    required: true,
    description: 'ID của khách hàng'
  })
  @IsNotEmpty()
  @IsString()
  @IsMongoId()
  customerId: string;

  @ApiProperty({ 
    required: true, 
    type: [PurchaseOrderItemDto],
    description: 'Danh sách sản phẩm đặt hàng'
  })
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items: PurchaseOrderItemDto[];

  @ApiProperty({
    required: true,
    description: 'Tổng giá trị đơn hàng trước khi điều chỉnh (nhập từ frontend)'
  })
  @IsNumber()
  @Min(0)
  subtotal: number;

  @ApiProperty({ 
    required: false, 
    type: [AdjustmentItemDto],
    description: 'Danh sách các khoản điều chỉnh'
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AdjustmentItemDto)
  adjustmentList?: AdjustmentItemDto[];

  @ApiProperty({ 
    required: true, 
    description: 'Tổng giá trị đơn hàng sau điều chỉnh (nhập từ frontend)'
  })
  @IsNumber()
  @Min(0)
  total: number;

  @ApiProperty({ 
    required: false, 
    enum: PurchaseOrderStatus,
    default: PurchaseOrderStatus.DRAFT,
    description: 'Trạng thái đơn hàng'
  })
  @IsOptional()
  @IsEnum(PurchaseOrderStatus)
  status?: PurchaseOrderStatus;

  @ApiProperty({
    required: false,
    description: 'Ghi chú đơn hàng'
  })
  @IsOptional()
  @IsString()
  notes?: string;
} 