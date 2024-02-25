import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { BillsService } from './bills.service';
import { CreateBillDto } from './dto/create-bill.dto';
import { UpdateBillDto } from './dto/update-bill.dto';
import { Bill } from './entities/bill.entity';
import { BillParams } from './models/bill.model';

@Controller('api/v1/admin/bills')
@ApiTags('admin/bills')
export class BillsController {
  constructor(private readonly billsService: BillsService) {}

  @Get()
  getAll(@Query() query: BillParams) {
    return this.billsService.getAll(query);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.billsService.getOne(id);
  }

  @Post()
  @ApiCreatedResponse({
    type: Bill,
  })
  create(@Request() req, @Body() createBillDto: CreateBillDto) {
    return this.billsService.create(req.user, createBillDto);
  }

  @Patch(':id')
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateBillDto: UpdateBillDto,
  ) {
    return this.billsService.update(req.user, id, updateBillDto);
  }

  @Delete(':id')
  delete(@Request() req, @Param('id') id: string) {
    return this.billsService.delete(req.user, id);
  }
}
