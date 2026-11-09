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
} from '@nestjs/swagger';
import { IsObjectIdPipe } from 'src/common/is-object-id/is-object-id.pipe';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer } from './entities/customer.entity';
import { CustomerParams } from './models/customer.model';
import { PaginatedCustomerResponse } from './dto/customer-response.dto';

@Controller('api/v1/admin/customers')
@ApiTags('admin/customers')
@ApiBearerAuth()
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'List customers (paginated)' })
  @ApiOkResponse({ type: PaginatedCustomerResponse })
  getAll(
    @Query() query: CustomerParams,
    @Query('isDeleted', new ParseBoolPipe({ optional: true }))
    isDeleted?: boolean,
  ) {
    query.isDeleted = isDeleted;
    return this.customersService.getAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer by id' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: Customer })
  getOne(@Param('id', IsObjectIdPipe) id: string) {
    return this.customersService.getOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a customer' })
  @ApiCreatedResponse({ type: Customer })
  create(@Request() req, @Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create(req.user, createCustomerDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a customer' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: Customer })
  update(
    @Request() req,
    @Param('id', IsObjectIdPipe) id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.customersService.update(req.user, id, updateCustomerDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a customer' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: Customer })
  delete(@Request() req, @Param('id', IsObjectIdPipe) id: string) {
    return this.customersService.delete(req.user, id);
  }
}
