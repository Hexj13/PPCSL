import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import * as constants from '../../../common/constants';
import {
  BodyType,
  ConditionType,
  Currency,
  DriveType,
  FuelType,
  RegistrationType,
  TransmissionType,
} from '../../../common/types';

export class SearchListingsDto {
  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Brand UUID',
  })
  @IsOptional()
  @IsUUID()
  brand_id?: string;

  @ApiPropertyOptional({
    example: ['550e8400-e29b-41d4-a716-446655440000'],
    description: 'Brand UUIDs (comma-separated or array)',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').filter((v) => v.trim() !== '');
    }
    if (Array.isArray(value)) {
      return value;
    }
    return [];
  })
  @IsArray()
  @IsUUID(undefined, { each: true })
  brand_ids?: string[];

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'Model UUID',
  })
  @IsOptional()
  @IsUUID()
  model_id?: string;

  @ApiPropertyOptional({
    example: ['550e8400-e29b-41d4-a716-446655440001'],
    description: 'Model UUIDs (comma-separated or array)',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').filter((v) => v.trim() !== '');
    }
    if (Array.isArray(value)) {
      return value;
    }
    return [];
  })
  @IsArray()
  @IsUUID(undefined, { each: true })
  model_ids?: string[];

  @ApiPropertyOptional({
    example: 'car',
    enum: ['car', 'truck', 'moto'],
    description: 'Vehicle type filter',
  })
  @IsOptional()
  @IsEnum(['car', 'truck', 'moto'], { message: 'vehicleType must be car, truck, or moto' })
  vehicleType?: 'car' | 'truck' | 'moto';

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
    example: ['Skopje', 'Bitola'],
    description: 'City names (comma-separated or array)',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').filter((v) => v.trim() !== '');
    }
    if (Array.isArray(value)) {
      return value;
    }
    return [];
  })
  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  cities?: string[];

  @ApiPropertyOptional({
    example: 'Petrol',
    enum: ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'LPG'],
    description: 'Fuel type',
  })
  @IsOptional()
  @IsEnum(FuelType)
  fuel?: FuelType;

  @ApiPropertyOptional({
    example: ['Petrol', 'Diesel'],
    enum: ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'LPG'],
    description: 'Fuel types (comma-separated or array)',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').filter((v) => v.trim() !== '');
    }
    if (Array.isArray(value)) {
      return value;
    }
    return [];
  })
  @IsArray()
  @IsEnum(FuelType, { each: true })
  fuels?: FuelType[];

  @ApiPropertyOptional({
    example: 'Automatic',
    enum: ['Manual', 'Automatic', 'CVT'],
    description: 'Transmission type',
  })
  @IsOptional()
  @IsEnum(TransmissionType)
  transmission?: TransmissionType;

  @ApiPropertyOptional({
    example: ['Manual', 'Automatic'],
    enum: ['Manual', 'Automatic', 'CVT'],
    description: 'Transmission types (comma-separated or array)',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').filter((v) => v.trim() !== '');
    }
    if (Array.isArray(value)) {
      return value;
    }
    return [];
  })
  @IsArray()
  @IsEnum(TransmissionType, { each: true })
  transmissions?: TransmissionType[];

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
      'Truck',
      'Bus',
      'SemiTruck',
      'Tractor',
      'SpecialEquipment',
      'Naked',
      'Sport',
      'Touring',
      'Cruiser',
      'Adventure',
      'Scooter',
      'Enduro',
      'Cross',
    ],
    description: 'Body type',
  })
  @IsOptional()
  @IsEnum(BodyType)
  body_type?: BodyType;

  @ApiPropertyOptional({
    example: ['Sedan', 'SUV'],
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
      'Bus',
      'SemiTruck',
      'Tractor',
      'SpecialEquipment',
      'Naked',
      'Sport',
      'Touring',
      'Cruiser',
      'Adventure',
      'Scooter',
      'Enduro',
      'Cross',
    ],
    description: 'Body types (comma-separated or array)',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').filter((v) => v.trim() !== '');
    }
    if (Array.isArray(value)) {
      return value;
    }
    return [];
  })
  @IsArray()
  @IsEnum(BodyType, { each: true })
  body_types?: BodyType[];

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
    example: ['Black', 'White'],
    description: 'Vehicle colors (comma-separated or array)',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').filter((v) => v.trim() !== '');
    }
    if (Array.isArray(value)) {
      return value;
    }
    return [];
  })
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  colors?: string[];

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
  doors_single?: number;

  @ApiPropertyOptional({
    example: ['2', '4', '5'],
    description: 'Number of doors (comma-separated or array)',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').filter((v) => v.trim() !== '');
    }
    if (Array.isArray(value)) {
      return value;
    }
    return [];
  })
  @IsArray()
  @IsString({ each: true })
  doors?: string[];

  @ApiPropertyOptional({
    example: 'EUR',
    enum: constants.currencies,
    description: 'Currency',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) {
      return undefined;
    }
    return value;
  })
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

  @ApiPropertyOptional({
    example: true,
    description: 'Filter by urgent listings',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  urgent?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter by new listings',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  is_new?: boolean;

  @ApiPropertyOptional({
    example: ['Undamaged', 'Damaged'],
    enum: ['Undamaged', 'Damaged', 'ForParts'],
    description: 'Condition types (comma-separated or array)',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').filter((v) => v.trim() !== '');
    }
    if (Array.isArray(value)) {
      return value;
    }
    return [];
  })
  @IsArray()
  @IsEnum(ConditionType, { each: true })
  conditions?: ConditionType[];

  @ApiPropertyOptional({
    example: ['Local', 'Foreign'],
    enum: ['Local', 'Foreign', 'Cleared'],
    description: 'Registration types (comma-separated or array)',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').filter((v) => v.trim() !== '');
    }
    if (Array.isArray(value)) {
      return value;
    }
    return [];
  })
  @IsArray()
  @IsEnum(RegistrationType, { each: true })
  registration_types?: RegistrationType[];

  @ApiPropertyOptional({
    example: 100,
    description: 'Minimum horsepower',
    minimum: 1,
    maximum: 9999,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(9999)
  horsepower_gte?: number;

  @ApiPropertyOptional({
    example: 500,
    description: 'Maximum horsepower',
    minimum: 1,
    maximum: 9999,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(9999)
  horsepower_lte?: number;

  @ApiPropertyOptional({
    example: ['FWD', 'AWD'],
    enum: ['FWD', 'RWD', 'AWD'],
    description: 'Drive types (comma-separated or array)',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').filter((v) => v.trim() !== '');
    }
    if (Array.isArray(value)) {
      return value;
    }
    return [];
  })
  @IsArray()
  @IsEnum(DriveType, { each: true })
  drive_types?: DriveType[];

  @ApiPropertyOptional({
    example: ['air_conditioning', 'navigation'],
    description: 'Equipment keys to filter by (AND logic, comma-separated or array)',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').filter((v) => v.trim() !== '');
    }
    if (Array.isArray(value)) {
      return value;
    }
    return [];
  })
  @IsArray()
  @IsString({ each: true })
  equipment?: string[];

  @ApiPropertyOptional({
    example: 'full',
    description:
      'Equipment filter mode: "full" = listing must have all selected options (AND), "partial" = at least one (OR)',
    enum: ['full', 'partial'],
  })
  @IsOptional()
  @IsIn(['full', 'partial'])
  equipmentMatch?: 'full' | 'partial';

  @ApiPropertyOptional({
    example: true,
    description: 'Filter by registered vehicles',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  is_registered?: boolean;
}
