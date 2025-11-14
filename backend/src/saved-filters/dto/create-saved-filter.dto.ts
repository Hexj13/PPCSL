import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsString, MaxLength } from 'class-validator';

import { IsValidFilterObject } from './validate-filters.validator';

export class CreateSavedFilterDto {
  @ApiProperty({
    description: 'Filter name',
    example: 'Мој филтер',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Filter parameters',
    example: {
      brand_ids: ['uuid1', 'uuid2'],
      price_gte: '10000',
      price_lte: '50000',
    },
  })
  @IsObject()
  @IsValidFilterObject({ message: 'Filters object contains invalid keys or values' })
  filters: Record<string, unknown>;
}
