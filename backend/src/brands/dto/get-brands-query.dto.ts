import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export class GetBrandsQueryDto {
  @ApiPropertyOptional({
    enum: ['car', 'truck', 'moto'],
    example: 'car',
    description: 'Filter brands by vehicle type',
  })
  @IsOptional()
  @IsEnum(['car', 'truck', 'moto'], {
    message: 'vehicleType мора да биде car, truck или moto',
  })
  vehicleType?: 'car' | 'truck' | 'moto';
}
