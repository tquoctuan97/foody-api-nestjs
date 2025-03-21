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
  Req,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { IsObjectIdPipe } from 'src/common/is-object-id/is-object-id.pipe';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, CustomerFilterDto, UpdateCustomerDto } from './dto/customer.dto';
import { Customer, CustomerDocument } from './entities/customer.entity';
import {
  RETAILER_ROLE_KEY,
  RetailerRole,
  RetailerRoleGuard,
} from '../retailers/retailer-access.guard';

interface AuthenticatedRequest extends Request {
  user?: {
    id?: string;
    retailerId: string;
  };
}

@ApiBearerAuth()
@Controller('api/v1/admin/customers')
@UseGuards(RetailerRoleGuard)
@ApiTags('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @SetMetadata(RETAILER_ROLE_KEY, {
    roles: [RetailerRole.OWNER, RetailerRole.MOD],
  })
  findAll(
    @Query() query: CustomerFilterDto,
    @Req() req: AuthenticatedRequest,
    @Query('isDeleted', new ParseBoolPipe({ optional: true }))
    isDeleted?: boolean,
  ) {
    query.isDeleted = isDeleted;
    return this.customersService.findAll(query, req);
  }

  @Get(':id')
  @SetMetadata(RETAILER_ROLE_KEY, {
    roles: [RetailerRole.OWNER, RetailerRole.MOD],
  })
  findOne(
    @Param('id', IsObjectIdPipe) id: string,
    @Req() req: AuthenticatedRequest
  ): Promise<CustomerDocument> {
    return this.customersService.findOne(id, req);
  }

  @Post()
  @SetMetadata(RETAILER_ROLE_KEY, {
    roles: [RetailerRole.OWNER, RetailerRole.MOD],
  })
  @ApiCreatedResponse({
    type: Customer,
  })
  async create(
    @Body() createCustomerDto: CreateCustomerDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<CustomerDocument> {
    return await this.customersService.create(createCustomerDto, req);
  }

  @Patch(':id')
  @SetMetadata(RETAILER_ROLE_KEY, {
    roles: [RetailerRole.OWNER, RetailerRole.MOD],
  })
  async update(
    @Param('id', IsObjectIdPipe) id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<CustomerDocument> {
    return await this.customersService.update(id, updateCustomerDto, req);
  }

  @Delete(':id')
  @SetMetadata(RETAILER_ROLE_KEY, {
    roles: [RetailerRole.OWNER],
  })
  async remove(
    @Param('id', IsObjectIdPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<CustomerDocument> {
    return await this.customersService.remove(id, req);
  }

  @Delete('hard-delete/:id')
  @SetMetadata(RETAILER_ROLE_KEY, {
    roles: [],
  })
  async hardDelete(
    @Param('id', IsObjectIdPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<CustomerDocument> {
    return await this.customersService.hardDelete(id, req);
  }

  @Patch('restore/:id')
  @SetMetadata(RETAILER_ROLE_KEY, {
    roles: [RetailerRole.OWNER],
  })
  async restore(
    @Param('id', IsObjectIdPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<CustomerDocument> {
    return await this.customersService.restore(id, req);
  }
}
