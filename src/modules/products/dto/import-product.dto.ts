import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ImportProductItemDto {
  @ApiProperty({ example: 'Cà phê sữa' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiPropertyOptional({
    example: '665f1c2e8b3a4d0011223344',
    description:
      'MongoDB ObjectId for upsert. Omitted or non-ObjectId → server generates a new id.',
  })
  @IsOptional()
  @IsString()
  value?: string;
}

export class ImportProductsResultDto {
  @ApiProperty({ example: 2 })
  created: number;

  @ApiProperty({ example: 1 })
  updated: number;
}
