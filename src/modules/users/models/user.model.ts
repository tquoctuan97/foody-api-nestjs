import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationParams } from 'src/common/pagination/pagination.model';

export enum Role {
  ADMIN = 'admin',
  USER = 'user',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export class UserParams extends PaginationParams {
  @ApiPropertyOptional({
    description: '`active` | `inactive`',
  })
  status?: UserStatus;
}
