import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export class GetBrandsQueryDto {
  @ApiPropertyOptional({
    enum: ['car', 'truck', 'moto', 'tire'],
    example: 'car',
    description: 'Filter brands by vehicle type',
  })
  @IsOptional()
  @IsEnum(['car', 'truck', 'moto', 'tire'], {
    message: 'validation.vehicleTypeFilterEnum',
  })
  vehicleType?: 'car' | 'truck' | 'moto' | 'tire';
}
