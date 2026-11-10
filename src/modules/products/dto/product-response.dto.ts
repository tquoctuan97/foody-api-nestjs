import { ApiProperty } from '@nestjs/swagger';
import { MetadataDto } from 'src/common/pagination/pagination.dto';
import { Product } from '../entities/product.entity';

export class PaginatedProductResponse {
  @ApiProperty({ type: [Product] })
  data: Product[];

  @ApiProperty({ type: MetadataDto })
  metadata: MetadataDto;
}
