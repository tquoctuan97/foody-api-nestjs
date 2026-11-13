import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CustomerPurchaseSumByDateDto {
  @ApiProperty({ type: String, format: 'date-time' })
  date: Date;

  @ApiProperty({ description: 'Tổng field sum trong ngày' })
  sum: number;
}

export class CustomerPurchaseBillSumDto {
  @ApiProperty({ type: String })
  billId: string;

  @ApiProperty()
  sum: number;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  billDate?: Date;
}

export class CustomerPurchaseDebtBillDto {
  @ApiProperty({ type: String })
  billId: string;

  @ApiProperty({ description: 'finalResult HĐ cuối kỳ (finalResult > 0)' })
  finalResult: number;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  billDate?: Date;
}

export class CustomerPurchaseByProductDto {
  @ApiProperty({ type: String })
  productId: string;

  @ApiProperty()
  productName: string;

  @ApiProperty({ description: 'Số dòng billList (lần xuất hiện)' })
  purchaseCount: number;

  @ApiProperty({ description: 'Tổng billList.total' })
  amountTotal: number;
}

export class CustomerPurchaseReportDto {
  @ApiProperty({ type: String })
  customerId: string;

  @ApiProperty()
  billDateFrom: string;

  @ApiProperty()
  billDateTo: string;

  @ApiProperty({ description: 'Số hóa đơn trong kỳ' })
  billCount: number;

  @ApiProperty({ description: 'Tổng field sum của các hóa đơn' })
  sumTotal: number;

  @ApiProperty({
    description: 'sumTotal / billCount (0 nếu không có hóa đơn)',
  })
  avgSumPerBill: number;

  @ApiPropertyOptional({ type: CustomerPurchaseBillSumDto })
  minBill: CustomerPurchaseBillSumDto | null;

  @ApiPropertyOptional({ type: CustomerPurchaseBillSumDto })
  maxBill: CustomerPurchaseBillSumDto | null;

  @ApiProperty({
    type: [CustomerPurchaseSumByDateDto],
    description: 'Doanh thu theo ngày (sum) — mini chart',
  })
  sumByDate: CustomerPurchaseSumByDateDto[];

  @ApiProperty({
    description:
      'Nợ: finalResult của HĐ mới nhất trong kỳ có finalResult > 0 (billDate, rồi createdAt)',
  })
  outstandingDebt: number;

  @ApiProperty({ description: 'sumTotal − outstandingDebt' })
  netValue: number;

  @ApiPropertyOptional({
    type: CustomerPurchaseDebtBillDto,
    description: 'HĐ nguồn outstandingDebt; null nếu không có finalResult > 0',
  })
  debtBill: CustomerPurchaseDebtBillDto | null;

  @ApiProperty({ type: [CustomerPurchaseByProductDto] })
  byProduct: CustomerPurchaseByProductDto[];
}
