import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, Matches } from 'class-validator';

export class ExportProductsDto {
  @ApiPropertyOptional({
    type: [String],
    description:
      'Product ids to export. Omit or pass an empty list to export every non-deleted product.',
  })
  @IsOptional()
  @IsArray()
  @Matches(/^[a-fA-F0-9]{24}$/, {
    each: true,
    message: 'each id must be a MongoDB ObjectId',
  })
  ids?: string[];
}
