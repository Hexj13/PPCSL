import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { BodyType, Currency, FuelType, TransmissionType } from '../../common/types';

export class SearchListingsDto {
  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Brand UUID',
  })
  @IsOptional()
  @IsUUID()
  brand_id?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'Model UUID',
  })
  @IsOptional()
  @IsUUID()
  model_id?: string;

  @ApiPropertyOptional({
    example: 2018,
    description: 'Minimum year',
    minimum: 1900,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  year_gte?: number;

  @ApiPropertyOptional({
    example: 2023,
    description: 'Maximum year',
    minimum: 1900,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  year_lte?: number;

  @ApiPropertyOptional({
    example: 10000,
    description: 'Minimum price',
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price_gte?: number;

  @ApiPropertyOptional({
    example: 50000,
    description: 'Maximum price',
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price_lte?: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'Minimum mileage in km',
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  mileage_gte?: number;

  @ApiPropertyOptional({
    example: 100000,
    description: 'Maximum mileage in km',
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  mileage_lte?: number;

  @ApiPropertyOptional({
    example: 'Skopje',
    description: 'City name',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

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

  @ApiPropertyOptional({
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
  @IsOptional()
  @IsEnum(BodyType)
  body_type?: BodyType;

  @ApiPropertyOptional({
    example: 1.6,
    description: 'Minimum engine displacement in liters',
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  engine_displ_l_gte?: number;

  @ApiPropertyOptional({
    example: 3.0,
    description: 'Maximum engine displacement in liters',
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  engine_displ_l_lte?: number;

  @ApiPropertyOptional({
    example: 'Black',
    description: 'Vehicle color',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  color?: string;

  @ApiPropertyOptional({
    example: 4,
    description: 'Number of doors',
    minimum: 2,
    maximum: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(2)
  @Max(5)
  doors?: number;

  @ApiPropertyOptional({
    example: 'EUR',
    enum: ['MKD', 'EUR'],
    description: 'Currency',
  })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiPropertyOptional({
    example: 'BMW',
    description: 'Search term for title',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Page number',
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    example: 20,
    description: 'Items per page',
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    example: 'price',
    description: 'Sort by field (e.g., price, year, createdAt)',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    example: 'ASC',
    enum: ['ASC', 'DESC'],
    description: 'Sort order',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}
