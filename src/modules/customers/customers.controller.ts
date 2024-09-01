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
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { IsObjectIdPipe } from 'src/common/is-object-id/is-object-id.pipe';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer } from './entities/customer.entity';
import { CustomerParams } from './models/customer.model';

@Controller('api/v1/admin/customers')
@ApiTags('bill-maker/customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  getAll(
    @Query() query: CustomerParams,
    @Query('isDeleted', new ParseBoolPipe({ optional: true }))
    isDeleted?: boolean,
  ) {
    query.isDeleted = isDeleted;
    return this.customersService.getAll(query);
  }

  @Get(':id')
  getOne(@Param('id', IsObjectIdPipe) id: string) {
    return this.customersService.getOne(id);
  }

  @Post()
  @ApiCreatedResponse({
    type: Customer,
  })
  create(@Request() req, @Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create(req.user, createCustomerDto);
  }

  @Patch(':id')
  update(
    @Request() req,
    @Param('id', IsObjectIdPipe) id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.customersService.update(req.user, id, updateCustomerDto);
  }

  @Delete(':id')
  delete(@Request() req, @Param('id', IsObjectIdPipe) id: string) {
    return this.customersService.delete(req.user, id);
  }
}
