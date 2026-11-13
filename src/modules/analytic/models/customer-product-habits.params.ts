import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { IsObjectId } from 'src/common/is-object-id/is-object-id.decorator';

export class CustomerProductHabitsParams {
  @ApiProperty()
  @IsString()
  @IsObjectId()
  customerId: string;

  @ApiPropertyOptional({
    default: 30,
    description: 'Số hóa đơn gần nhất (billDate, createdAt)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  billLimit?: number;
}
