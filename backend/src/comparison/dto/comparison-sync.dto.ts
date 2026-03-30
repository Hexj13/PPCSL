import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsOptional, IsUUID } from 'class-validator';

export class ComparisonSyncDto {
  @ApiPropertyOptional({ type: [String], maxItems: 3 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsUUID('4', { each: true })
  vehicleListingIds?: string[];

  @ApiPropertyOptional({ type: [String], maxItems: 3 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsUUID('4', { each: true })
  tireListingIds?: string[];
}
