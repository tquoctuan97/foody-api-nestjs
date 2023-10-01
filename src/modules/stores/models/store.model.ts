import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationParams } from 'src/common/pagination/pagination.model';
import { Role } from 'src/modules/users/models/user.model';

export enum StoreStatus {
  PUBLISHED = 'published',
  PRIVATE = 'private',
  DRAFT = 'draft',
}

export class StorePublicParams extends PaginationParams {
  @ApiPropertyOptional({
    description: 'Multiple use `|` OR',
  })
  cuisine?: string;

  @ApiPropertyOptional()
  owner?: string;
}

export class StoreAdminParams extends StorePublicParams {
  @ApiPropertyOptional()
  user?: {
    id: string;
    role: Role;
  };

  @ApiPropertyOptional({
    description: '`published` | `private` | `draft`',
  })
  status?: StoreStatus;
}
