import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

import * as constants from '../../../common/constants';
import { ConditionType, Currency, ListingStatus, RegistrationType } from '../../../common/types';

import { CreateVehicleDto } from './create-vehicle.dto';

export class CreateListingDto {
  @ApiPropertyOptional({
    example: '2020 BMW 3 Series Sedan',
    description: 'Listing title',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiProperty({
    example: 25000,
    description: 'Price',
    minimum: 0,
    maximum: 999999999,
  })
  @IsInt()
  @Min(0)
  @Max(999999999)
  price: number;

  @ApiPropertyOptional({
    example: 'EUR',
    enum: constants.currencies,
    description: 'Currency',
  })
  @IsOptional()
  @IsEnum(Currency, {
    message: `Currency must be one of: ${constants.currencies.join(', ')}`,
  })
  currency?: Currency;

  @ApiProperty({
    example: 'Skopje',
    description: 'City',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Price is negotiable',
  })
  @IsOptional()
  @IsBoolean()
  negotiable?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Available in credit or installment',
  })
  @IsOptional()
  @IsBoolean()
  available_in_credit?: boolean;

  @ApiPropertyOptional({
    example: 5000,
    description: 'Down payment amount (when available_in_credit is true)',
    minimum: 0,
    maximum: 999999999,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999999999)
  down_payment_amount?: number;

  @ApiPropertyOptional({
    example: 'Well maintained vehicle with full service history. No accidents.',
    description: 'Listing description',
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({
    example: [
      'http://localhost:4000/uploads/image1.webp',
      'http://localhost:4000/uploads/image2.webp',
    ],
    description: 'Array of image URLs (2-20 images required)',
    type: [String],
    minItems: 2,
    maxItems: 20,
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(2, {
    message: 'Минимум 2 слики',
  })
  @ArrayMaxSize(20, {
    message: 'Максимум 20 слики',
  })
  images?: string[];

  @ApiPropertyOptional({
    example: 'Active',
    enum: ['Active', 'Paused', 'Closed'],
    description: 'Listing status',
  })
  @IsOptional()
  @IsEnum(ListingStatus, { message: 'Статусот мора да биде Active, Paused или Closed' })
  status?: ListingStatus;

  @ApiPropertyOptional({
    example: false,
    description: 'Mark listing as urgent',
  })
  @IsOptional()
  @IsBoolean()
  urgent?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Mark listing as new',
  })
  @IsOptional()
  @IsBoolean()
  is_new?: boolean;

  @ApiPropertyOptional({
    example: 'WBA3A5G59CNP12345',
    description: 'Vehicle Identification Number (17 characters, no I, O, Q)',
    pattern: '^[A-HJ-NPR-Z0-9]{17}$',
  })
  @IsOptional()
  @IsString()
  @Length(17, 17, { message: 'VIN мора да биде точно 17 карактери' })
  @Matches(/^[A-HJ-NPR-Z0-9]{17}$/i, {
    message: 'VIN мора да содржи само букви и бројки (без I, O, Q)',
  })
  vin?: string;

  @ApiProperty({
    example: 'Undamaged',
    enum: ['Undamaged', 'Damaged', 'ForParts'],
    description: 'Vehicle condition',
  })
  @IsEnum(ConditionType, { message: 'Состојбата мора да биде Undamaged, Damaged или ForParts' })
  condition: ConditionType;

  @ApiProperty({
    example: 'Local',
    enum: ['Local', 'Foreign', 'Cleared'],
    description: 'Registration type',
  })
  @IsEnum(RegistrationType, {
    message: 'validation.registrationType',
  })
  registration_type: RegistrationType;

  @ApiProperty({
    example: 150,
    description: 'Horsepower',
    minimum: 1,
    maximum: 9999,
  })
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(1)
  @Max(9999)
  horsepower: number;

  @ApiPropertyOptional({
    example: 110,
    description: 'Power in kilowatts',
    minimum: 1,
    maximum: 9999,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9999)
  power_kw?: number;

  @ApiPropertyOptional({
    example: ['air_conditioning', 'navigation', 'parking_sensors'],
    description: 'Array of equipment keys (max 40 items)',
    type: [String],
    maxItems: 40,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(40, {
    message: 'Максимум 40 опции',
  })
  equipment?: string[];

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Assign listing to a different user (admin only)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'errors.invalidUserId' })
  assignedUserId?: string;

  @ApiProperty({
    type: () => CreateVehicleDto,
    description: 'Vehicle details',
  })
  @ValidateNested()
  @Type(() => CreateVehicleDto)
  vehicle: CreateVehicleDto;
}
