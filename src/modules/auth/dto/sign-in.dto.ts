import { ApiProperty } from '@nestjs/swagger';

export class SignInDto {
  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'secret123', minLength: 6 })
  password: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  oldPassword: string;

  @ApiProperty({ minLength: 6 })
  newPassword: string;

  @ApiProperty({ description: 'Must match newPassword' })
  confirmPassword: string;
}
