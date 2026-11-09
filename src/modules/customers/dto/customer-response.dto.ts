import { ApiProperty } from '@nestjs/swagger';
import { MetadataDto } from 'src/common/pagination/pagination.dto';
import { Customer } from '../entities/customer.entity';

export class PaginatedCustomerResponse {
  @ApiProperty({ type: [Customer] })
  data: Customer[];

  @ApiProperty({ type: MetadataDto })
  metadata: MetadataDto;
}
