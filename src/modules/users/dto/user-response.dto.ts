import { ApiProperty } from '@nestjs/swagger';
import { MetadataDto } from 'src/common/pagination/pagination.dto';
import { User } from '../entities/user.entity';

export class PaginatedUserResponse {
  @ApiProperty({ type: [User] })
  data: User[];

  @ApiProperty({ type: MetadataDto })
  metadata: MetadataDto;
}
