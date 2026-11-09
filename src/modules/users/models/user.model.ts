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
    enum: UserStatus,
    description: 'Filter by account status',
  })
  status?: UserStatus;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'When true, list soft-deleted users only',
  })
  isDeleted?: boolean;
}
