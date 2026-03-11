import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

import * as constants from '../../../common/constants';
import { ConditionType, Currency, RegistrationType } from '../../../common/types';

import { CreateVehicleDto } from './create-vehicle.dto';

export class UpdateListingDto {
  @ApiPropertyOptional({
    example: '2020 BMW 3 Series Sedan - Updated',
    description: 'Listing title',
  })
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    example: 24000,
    description: 'Price',
    minimum: 0,
    maximum: 999999999,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999999999)
  price?: number;

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

  @ApiPropertyOptional({
    example: 'Bitola',
    description: 'City',
  })
  @IsOptional()
  city?: string;

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
    description: 'Down payment amount',
    minimum: 0,
    maximum: 999999999,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999999999)
  down_payment_amount?: number | null;

  @ApiPropertyOptional({
    example: 'Updated description with new information.',
    description: 'Listing description',
  })
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: ['http://localhost:4000/uploads/new-image.webp'],
    description: 'Array of image URLs',
    type: [String],
  })
  @IsOptional()
  images?: string[];

  @ApiPropertyOptional({
    example: true,
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
    description: 'Vehicle Identification Number',
    pattern: '^[A-HJ-NPR-Z0-9]{17}$',
  })
  @IsOptional()
  @IsString()
  @Length(17, 17, { message: 'VIN мора да биде точно 17 карактери' })
  @Matches(/^[A-HJ-NPR-Z0-9]{17}$/i, {
    message: 'VIN мора да содржи само букви и бројки (без I, O, Q)',
  })
  vin?: string;

  @ApiPropertyOptional({
    example: 'Undamaged',
    enum: ['Undamaged', 'Damaged', 'ForParts'],
    description: 'Vehicle condition',
  })
  @IsOptional()
  @IsEnum(ConditionType, { message: 'Состојбата мора да биде Undamaged, Damaged или ForParts' })
  condition?: ConditionType;

  @ApiPropertyOptional({
    example: 'Local',
    enum: ['Local', 'Foreign', 'Cleared'],
    description: 'Registration type',
  })
  @IsOptional()
  @IsEnum(RegistrationType, {
    message: 'validation.registrationType',
  })
  registration_type?: RegistrationType;

  @ApiPropertyOptional({
    example: 150,
    description: 'Horsepower',
    minimum: 1,
    maximum: 9999,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(1)
  @Max(9999)
  horsepower?: number;

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
    type: () => CreateVehicleDto,
    description: 'Vehicle details',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateVehicleDto)
  vehicle?: CreateVehicleDto;
}
