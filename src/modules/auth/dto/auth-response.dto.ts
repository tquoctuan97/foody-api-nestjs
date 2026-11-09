import { ApiProperty, OmitType } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';

export class SignInResponseDto {
  @ApiProperty({
    description: 'JWT access token (Bearer)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token: string;
}

export class UserProfileDto extends OmitType(User, ['password'] as const) {}
