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

  @Get('/customer-overview/:customerId')
  getCustomerOverview(
    @Param('customerId') customerId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    if (!customerId) {
      throw new BadRequestException('Customer id is required');
    }

    return this.insightService.getCustomerOverview(
      customerId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Get('/customer-overview-by-month/:customerId')
  getCustomerProductOverviewByMonth(
    @Param('customerId') customerId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    if (!customerId) {
      throw new BadRequestException('Customer id is required');
    }
    return this.insightService.getCustomerOverviewByMonth(
      customerId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

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

  @Get('/top-customer')
  getTopCustomer(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('top') top?: number,
    @Query('sortBy') sortBy?: 'debt' | 'spent' | 'paid',
  ) {
    if (!from || !to) {
      throw new BadRequestException('from and to are required');
    }
    const fromDate = new Date(from);
    const toDate = new Date(to);
    return this.insightService.getTopCustomer(fromDate, toDate, sortBy, top);
  }

  @Get('/finance-overview')
  getFinanceOverView(@Query('from') from: string, @Query('to') to: string) {
    if (!from || !to) {
      throw new BadRequestException('from and to are required');
    }
    const fromDate = new Date(from);
    const toDate = new Date(to);
    return this.insightService.financeOverview(fromDate, toDate);
  }
  @Get('/finance-overview-by-month')
  getFinanceOverViewByMonth(
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    if (!from || !to) {
      throw new BadRequestException('from and to are required');
    }
    const fromDate = new Date(from);
    const toDate = new Date(to);
    return this.insightService.financeOverviewByMonth(fromDate, toDate);
  }
  @Get('/test')
  getTestFn() {
    return this.insightService.getTest();
  }
}
