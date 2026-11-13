import { ApiProperty } from '@nestjs/swagger';
import { CustomerPurchaseByProductDto } from './customer-purchase-report.dto';

export class CustomerProductHabitsDto {
  @ApiProperty({ type: String })
  customerId: string;

  @ApiProperty({
    description: 'Số HĐ thực tế lấy mẫu (≤ billLimit)',
  })
  billsSampled: number;

  @ApiProperty({ type: [CustomerPurchaseByProductDto] })
  products: CustomerPurchaseByProductDto[];
}
