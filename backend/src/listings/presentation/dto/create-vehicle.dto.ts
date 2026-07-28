import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

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

  @ApiPropertyOptional({
    example: 'DE',
    description: 'Country of origin (ISO 3166-1 alpha-2)',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined) return value;
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed.toUpperCase();
  })
  @IsString()
  @Matches(/^[A-Z]{2}$/, { message: 'validation.countryOfOriginIso2' })
  country_of_origin?: string | null;

  @ApiPropertyOptional({
    example: 1,
    description: 'Number of previous owners',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  owners_count?: number | null;

  @ApiPropertyOptional({
    example: 'beige',
    description: 'Interior color',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  interior_color?: string | null;

  @ApiPropertyOptional({
    example: 5,
    description: 'Number of seats',
    minimum: 1,
    maximum: 9,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9)
  seats?: number | null;
}
