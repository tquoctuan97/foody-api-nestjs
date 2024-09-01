import { ApiProperty } from '@nestjs/swagger';

export class CreateCustomerDto {
  @ApiProperty({
    required: true,
    type: String,
  })
  name: string;

  @ApiProperty({
    required: true,
    type: String,
  })
  displayName: string;

  @ApiProperty({
    required: false,
    default: null,
    type: String,
  })
  phoneNumber: number | null;
}
