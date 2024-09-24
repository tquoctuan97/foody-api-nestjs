import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InsightService } from './insight.service';

@Controller('api/v1/admin/insight')
@ApiTags('bill-maker/insight')
export class InsightController {
  constructor(private readonly insightService: InsightService) {}

  @Get('/customer-product-overview/:customerId')
  getCustomerProductOverview(
    @Param('customerId') customerId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    if (!customerId) {
      throw new BadRequestException('Customer id is required');
    }
    return this.insightService.getCustomerOverviewProduct(customerId, from, to);
  }

  @Get('/bills-with-item')
  async getBillsWithItem(@Query('itemName') itemName: string) {
    if (!itemName) {
      throw new BadRequestException('Item name is required');
    }
    return this.insightService.getBillsWithItem(itemName);
  }

  @Get('/top-selling-items-by-month')
  getTopSellingItemsByMonth(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('top') top?: number,
    @Query('groupBy') groupBy?: 'day' | 'week' | 'month' | 'quarter' | 'year',
    @Query('sortBy') sortBy?: 'quantity' | 'revenue',
  ) {
    if (!from || !to) {
      throw new BadRequestException('from and to are required');
    }
    const fromDate = new Date(from);
    const toDate = new Date(to);
    return this.insightService.getTopItemsByMonth(
      fromDate,
      toDate,
      sortBy,
      groupBy,
      top,
    );
  }

  @Get('/top-selling-items')
  getTopSellingItems(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('top') top?: number,
    @Query('sortBy') sortBy?: 'quantity' | 'revenue',
  ) {
    if (!from || !to) {
      throw new BadRequestException('from and to are required');
    }
    const fromDate = new Date(from);
    const toDate = new Date(to);
    return this.insightService.getTopItems(fromDate, toDate, sortBy, top);
  }

  //NEW
  @Get('/customer-ranking')
  getCustomerRanking(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('sortBy') sortBy: string,
    @Query('top') top?: number,
  ) {
    if (!from || !to) {
      throw new BadRequestException('from and to are required');
    }
    const fromDate = new Date(from);
    const toDate = new Date(to);
    return this.insightService.getCustomerRanking(
      fromDate,
      toDate,
      sortBy,
      top,
    );
  }

  @Get('/finance-overview')
  getFinanceOverView(
    @Query('customerId') customerId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    return this.insightService.getOverviewFinance(fromDate, toDate, customerId);
  }
  @Get('/finance-chart-data')
  getFinanceOverViewByMonth(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('groupBy')
    groupBy: 'day' | 'week' | 'month' | 'quarter' | 'year' = 'month',
    @Query('customerId') customerId?: string,
  ) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    return this.insightService.getFinanceChartData(
      fromDate,
      toDate,
      groupBy,
      customerId,
    );
  }
  @Get('/test')
  getTestFn() {
    return this.insightService.getFinanceChartData(
      new Date('2024-01-01T00:00:00.000Z'),
      new Date('2024-12-31T23:59:59.999'),
    );
  }
}
