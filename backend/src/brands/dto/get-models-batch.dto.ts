import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsUUID } from 'class-validator';

export class GetModelsBatchDto {
  @ApiProperty({
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440001'],
    description: 'Array of brand UUIDs',
  })
  @IsArray({ message: 'validation.brandIdsMustBeArray' })
  @IsUUID(4, { each: true, message: 'validation.brandIdUuid' })
  brandIds: string[];

  @ApiProperty({
    enum: ['car', 'truck', 'moto', 'tire'],
    required: false,
    description: 'Filter models by vehicle type',
  })
  @IsOptional()
  @IsEnum(['car', 'truck', 'moto', 'tire'], {
    message: 'validation.vehicleTypeFilterEnum',
  })
  vehicleType?: 'car' | 'truck' | 'moto' | 'tire';
}
