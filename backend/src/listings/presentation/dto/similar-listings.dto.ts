import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class SimilarListingsQueryDto {
  @ApiPropertyOptional({
    example: 4,
    description: 'Number of listings to return',
    minimum: 1,
    maximum: 8,
    default: 4,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(8)
  limit?: number = 4;

  @ApiPropertyOptional({
    example: 0,
    description: 'Offset for pagination',
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
