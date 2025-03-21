import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { PaginationParams } from 'src/common/pagination/pagination.model';
import { PurchaseOrderStatus } from '../entities/purchase-order.entity';

export class PurchaseOrderFilterDto extends PaginationParams {
  @ApiPropertyOptional({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Lọc theo ngày đặt hàng cụ thể'
  })
  orderDate?: string;

  @ApiPropertyOptional({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Lọc từ ngày đặt hàng (phải trước hoặc bằng orderDateTo)'
  })
  orderDateFrom?: string;

  @ApiPropertyOptional({
    example: '2024-01-31T00:00:00.000Z',
    description: 'Lọc đến ngày đặt hàng'
  })
  orderDateTo?: string;

  @ApiPropertyOptional({
    description: 'ID của cửa hàng',
  })
  @IsOptional()
  @IsMongoId()
  retailerId?: string;

  @ApiPropertyOptional({
    description: 'ID của khách hàng',
  })
  @IsOptional()
  @IsMongoId()
  customerId?: string;

  @ApiPropertyOptional({
    description: 'Trạng thái đơn hàng',
    enum: PurchaseOrderStatus,
  })
  @IsOptional()
  @IsEnum(PurchaseOrderStatus)
  status?: PurchaseOrderStatus;

  @ApiPropertyOptional({
    description: 'Lọc theo đơn hàng đã xóa',
  })
  isDeleted?: boolean;
} 