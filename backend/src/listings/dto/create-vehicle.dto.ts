import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';

import { BodyType, FuelType, TransmissionType } from '../../common/types';

export class CreateVehicleDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Brand UUID',
  })
  @IsUUID()
  brand_id: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'Model UUID',
  })
  @IsUUID()
  model_id: string;

  @ApiProperty({
    example: 2020,
    description: 'Manufacturing year',
    minimum: 1900,
    maximum: 2025,
  })
  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  year: number;

  @ApiPropertyOptional({
    example: 2.0,
    description: 'Engine displacement in liters',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  engine_displ_l?: number;

  @ApiPropertyOptional({
    example: 50000,
    description: 'Mileage in kilometers',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  mileage_km?: number;

  @ApiPropertyOptional({
    example: 'Petrol',
    enum: ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'LPG'],
    description: 'Fuel type',
  })
  @IsOptional()
  @IsEnum(FuelType)
  fuel?: FuelType;

  @ApiPropertyOptional({
    example: 'Automatic',
    enum: ['Manual', 'Automatic', 'CVT'],
    description: 'Transmission type',
  })
  @IsOptional()
  @IsEnum(TransmissionType)
  transmission?: TransmissionType;

  @ApiProperty({
    example: 'Sedan',
    enum: [
      'Sedan',
      'Hatchback',
      'Wagon',
      'SUV',
      'Coupe',
      'Convertible',
      'Van',
      'Pickup',
      'Minivan',
    ],
    description: 'Body type',
  })
  @IsEnum(BodyType, { message: 'Типот на каросерија мора да биде валиден' })
  body_type: BodyType;

  @ApiPropertyOptional({
    example: 'Black',
    description: 'Vehicle color',
  })
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({
    example: 4,
    description: 'Number of doors',
    minimum: 2,
    maximum: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(5)
  doors?: number;
}
