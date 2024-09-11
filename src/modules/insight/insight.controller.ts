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
  getCustomerOverview(@Param('customerId') customerId: string) {
    return this.insightService.getCustomerOverview(customerId);
  }
  @Get('/customer-product-overview/:customerId')
  getCustomerProductOverview(
    @Param('customerId') customerId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
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
    @Query('sortBy') sortBy?: 'quantity' | 'revenue',
  ) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    return this.insightService.getTopItemsByMonth(
      fromDate,
      toDate,
      sortBy,
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
    const fromDate = new Date(from);
    const toDate = new Date(to);
    return this.insightService.getTopItems(fromDate, toDate, sortBy, top);
  }

  // @Get('/revenue-barchart')
  // getRevenueForBarChart(@Query('from') from: string, @Query('to') to: string) {
  //   const fromDate = new Date(from);
  //   const toDate = new Date(to);
  //   return this.insightService.getRevenueForBarChart(fromDate, toDate);
  // }
}
