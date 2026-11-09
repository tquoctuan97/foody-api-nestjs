import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  Patch,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { BillsService } from './bills.service';
import { CreateBillDto } from './dto/create-bill.dto';
import { UpdateBillDto } from './dto/update-bill.dto';
import { Bill } from './entities/bill.entity';
import { BillParams, BillSummaryParams } from './models/bill.model';
import { IsObjectIdPipe } from 'src/common/is-object-id/is-object-id.pipe';
import {
  BillSummaryByCustomerItemDto,
  BillSummaryByDateItemDto,
  PaginatedBillResponse,
} from './dto/bill-response.dto';

@Controller('api/v1/admin/bills')
@ApiTags('admin/bills')
@ApiBearerAuth()
export class BillsController {
  constructor(private readonly billsService: BillsService) {}

  @Get()
  @ApiOperation({ summary: 'List bills (paginated)' })
  @ApiOkResponse({ type: PaginatedBillResponse })
  getAll(
    @Query() query: BillParams,
    @Query('isDeleted', new ParseBoolPipe({ optional: true }))
    isDeleted?: boolean,
  ) {
    query.isDeleted = isDeleted;
    return this.billsService.getAll(query);
  }

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
    return this.billsService.getBillsByRange(
      query.billDateFrom,
      query.billDateTo,
      groupBy,
      query.search,
      query.customerId,
      isDeleted,
    );
  }

  @Get('latest/:customerId')
  @ApiOperation({ summary: 'Latest non-deleted bill for a customer' })
  @ApiParam({ name: 'customerId', type: String })
  @ApiOkResponse({ type: Bill })
  getLatestBill(@Param('customerId', IsObjectIdPipe) customerId: string) {
    return this.billsService.getLatestBill(customerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get bill by id' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: Bill })
  getOne(@Param('id', IsObjectIdPipe) id: string) {
    return this.billsService.getOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a bill' })
  @ApiCreatedResponse({ type: Bill })
  create(@Request() req, @Body() createBillDto: CreateBillDto) {
    return this.billsService.create(req.user, createBillDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a bill' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: Bill })
  update(
    @Request() req,
    @Param('id', IsObjectIdPipe) id: string,
    @Body() updateBillDto: UpdateBillDto,
  ) {
    return this.billsService.update(req.user, id, updateBillDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a bill' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: Bill })
  delete(@Request() req, @Param('id', IsObjectIdPipe) id: string) {
    return this.billsService.delete(req.user, id);
  }
}
