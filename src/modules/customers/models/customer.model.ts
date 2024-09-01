import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationParams } from 'src/common/pagination/pagination.model';

export class CustomerParams extends PaginationParams {
  @ApiPropertyOptional({
    description: 'get deleted customer list',
  })
  isDeleted?: boolean;
}
