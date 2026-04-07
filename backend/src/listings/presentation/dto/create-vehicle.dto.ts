import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';

import { fuelTypes } from '../../../common/constants';
import { BodyType, DriveType, FuelType, TransmissionType } from '../../../common/types';

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
    maximum: new Date().getFullYear() + 1,
  })
  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  year: number;

  @ApiPropertyOptional({
    example: 2.0,
    description: 'Engine displacement in liters',
    minimum: 0,
    maximum: 99,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(99)
  engine_displ_l?: number;

  @ApiPropertyOptional({
    example: 50000,
    description: 'Mileage in kilometers',
    minimum: 0,
    maximum: 9999999,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999999)
  mileage_km?: number;

  @ApiPropertyOptional({
    example: 'Petrol',
    enum: fuelTypes,
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

  @ApiPropertyOptional({
    example: 'FWD',
    enum: ['FWD', 'RWD', 'AWD'],
    description: 'Drive type (not applicable for motorcycles)',
  })
  @IsOptional()
  @IsEnum(DriveType, { message: 'validation.driveTypeEnum' })
  drive_type?: DriveType;

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
      'Truck',
    ],
    description: 'Body type',
  })
  @IsEnum(BodyType, { message: 'validation.bodyTypeEnum' })
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
