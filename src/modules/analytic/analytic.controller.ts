import {
  Controller,
  Get,
  ParseBoolPipe,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  BillSummaryByCustomerItemDto,
  BillSummaryByDateItemDto,
  PaginatedBillResponse,
} from '../bills/dto/bill-response.dto';
import { BillSummaryParams } from '../bills/models/bill.model';
import { AnalyticService } from './analytic.service';
import { CustomerProductHabitsDto } from './dto/customer-product-habits.dto';
import { CustomerPurchaseReportDto } from './dto/customer-purchase-report.dto';
import { CustomerProductHabitsParams } from './models/customer-product-habits.params';
import { UnlinkedBillsByCustomerItemDto } from './dto/unlinked-bills-response.dto';
import { CustomerPurchaseReportParams } from './models/customer-purchase-report.params';
import { UnlinkedBillItemsParams } from './models/unlinked-bill-items.params';
import { UnlinkedBillsParams } from './models/unlinked-bills.params';

@Controller('api/v1/admin/analytic')
@ApiTags('admin/analytic')
@ApiBearerAuth()
export class AnalyticController {
  constructor(private readonly analyticService: AnalyticService) {}

  @Get('summary-bill')
  @ApiOperation({
    summary: 'Summarize bills in a date range',
    description:
      'Requires billDateFrom and billDateTo. groupBy aggregates by calendar day or customer.',
  })
  @ApiOkResponse({
    schema: {
      oneOf: [
        {
          type: 'array',
          items: { $ref: getSchemaPath(BillSummaryByDateItemDto) },
        },
        {
          type: 'array',
          items: { $ref: getSchemaPath(BillSummaryByCustomerItemDto) },
        },
      ],
    },
  })
  getSummaryBillByDate(
    @Query() query: BillSummaryParams,
    @Query('groupBy') groupBy: 'date' | 'customer',
    @Query('isDeleted', new ParseBoolPipe({ optional: true }))
    isDeleted?: boolean,
  ) {
    return this.analyticService.getBillsByRange(
      query.billDateFrom,
      query.billDateTo,
      groupBy,
      query.search,
      query.customerId,
      isDeleted,
    );
  }

  @Get('unlinked-bills')
  @ApiOperation({
    summary:
      'Bills without customerId. groupBy=customerName for totals; customerName=… for that name’s bills (paginated).',
  })
  @ApiOkResponse({
    schema: {
      oneOf: [
        { $ref: getSchemaPath(PaginatedBillResponse) },
        {
          type: 'array',
          items: { $ref: getSchemaPath(UnlinkedBillsByCustomerItemDto) },
        },
      ],
    },
  })
  getUnlinkedBills(
    @Query() query: UnlinkedBillsParams,
    @Query('isDeleted', new ParseBoolPipe({ optional: true }))
    isDeleted?: boolean,
  ) {
    return this.analyticService.getUnlinkedBills(query, isDeleted);
  }

  @Get('unlinked-bill-items')
  @ApiOperation({
    summary:
      'Paginated bills with at least one billList line missing productId (optional search on line name).',
  })
  @ApiOkResponse({ type: PaginatedBillResponse })
  getUnlinkedBillItems(
    @Query() query: UnlinkedBillItemsParams,
    @Query('isDeleted', new ParseBoolPipe({ optional: true }))
    isDeleted?: boolean,
  ) {
    return this.analyticService.getUnlinkedBillItems(query, isDeleted);
  }

  @Get('customer-purchase-report')
  @ApiOperation({
    summary:
      'Customer purchase report: bill sum total + per-product purchase count/amount (billDate range). Lines without productId are skipped.',
  })
  @ApiOkResponse({ type: CustomerPurchaseReportDto })
  getCustomerPurchaseReport(
    @Query() query: CustomerPurchaseReportParams,
    @Query('isDeleted', new ParseBoolPipe({ optional: true }))
    isDeleted?: boolean,
  ) {
    return this.analyticService.getCustomerPurchaseReport(query, isDeleted);
  }

  @Get('customer-product-habits')
  @ApiOperation({
    summary:
      'Top products from the customer’s latest N bills (no date range). For editor suggestions.',
  })
  @ApiOkResponse({ type: CustomerProductHabitsDto })
  getCustomerProductHabits(@Query() query: CustomerProductHabitsParams) {
    return this.analyticService.getCustomerProductHabits(query);
  }
}
