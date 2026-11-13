import { ApiProperty } from '@nestjs/swagger';
import { CustomerPurchaseByProductDto } from './customer-purchase-report.dto';

export class OverviewFinanceDto {
  @ApiProperty()
  billDateFrom: string;

  @ApiProperty()
  billDateTo: string;

  @ApiProperty({ description: 'Tổng field sum các HĐ trong kỳ' })
  revenue: number;

  @ApiProperty({
    description:
      'Tổng finalResult HĐ mới nhất (billDate, createdAt) của mỗi khách trong kỳ (finalResult > 0)',
  })
  debt: number;

  @ApiProperty({ description: 'revenue − debt' })
  net: number;
}

export class OverviewProductDto {
  @ApiProperty()
  billDateFrom: string;

  @ApiProperty()
  billDateTo: string;

  @ApiProperty({
    type: [CustomerPurchaseByProductDto],
    description: 'Top 5 theo purchaseCount',
  })
  products: CustomerPurchaseByProductDto[];
}

export class OverviewCustomerRankBillCountDto {
  @ApiProperty({ type: String })
  customerId: string;

  @ApiProperty()
  customerName: string;

  @ApiProperty({ description: 'Số HĐ trong kỳ' })
  billCount: number;
}

export class OverviewCustomerRankRevenueDto {
  @ApiProperty({ type: String })
  customerId: string;

  @ApiProperty()
  customerName: string;

  @ApiProperty({ description: 'Tổng sum trong kỳ' })
  revenue: number;
}

export class OverviewCustomerRankDebtDto {
  @ApiProperty({ type: String })
  customerId: string;

  @ApiProperty()
  customerName: string;

  @ApiProperty({
    description: 'finalResult HĐ mới nhất của khách trong kỳ',
  })
  debt: number;
}

export class OverviewCustomerDto {
  @ApiProperty()
  billDateFrom: string;

  @ApiProperty()
  billDateTo: string;

  @ApiProperty({ type: [OverviewCustomerRankBillCountDto] })
  topByBillCount: OverviewCustomerRankBillCountDto[];

  @ApiProperty({ type: [OverviewCustomerRankRevenueDto] })
  topByRevenue: OverviewCustomerRankRevenueDto[];

  @ApiProperty({ type: [OverviewCustomerRankDebtDto] })
  topByDebt: OverviewCustomerRankDebtDto[];
}
