import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomerDto {
  @ApiProperty({ example: 'Nguyen Van A' })
  name: string;

  @ApiProperty({ example: 'Anh A' })
  displayName: string;

  @ApiPropertyOptional({ nullable: true, type: Number, example: null })
  phoneNumber: number | null;
}
