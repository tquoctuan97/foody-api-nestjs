import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsString, Matches } from 'class-validator';

export class BulkDeleteProductsDto {
  @ApiProperty({
    type: [String],
    example: ['665f1c2e8b3a4d0011223344'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @Matches(/^[a-fA-F0-9]{24}$/, {
    each: true,
    message: 'each id must be a MongoDB ObjectId',
  })
  ids: string[];
}

export class BulkDeleteProductsResultDto {
  @ApiProperty({ example: 3 })
  deleted: number;
}
