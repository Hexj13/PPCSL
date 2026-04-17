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
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import * as constants from '../../../common/constants';
import { ConditionType, Currency, ListingCategory, RegistrationType } from '../../../common/types';

import { CreateVehicleDto } from './create-vehicle.dto';
import { UpdateTireDto } from './update-tire.dto';

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
    description: 'Listing description (legacy; updates Romanian if description_ro omitted)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @ApiPropertyOptional({
    example: 'Actualizat...',
    description: 'Listing description in Romanian',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description_ro?: string | null;

  @ApiPropertyOptional({
    example: 'Updated description...',
    description: 'Listing description in Russian',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description_ru?: string | null;

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
  @Length(17, 17, { message: 'validation.vinLength17' })
  @Matches(/^[A-HJ-NPR-Z0-9]{17}$/i, {
    message: 'validation.vinCharset',
  })
  vin?: string;

  @ApiPropertyOptional({
    example: 'Undamaged',
    enum: ['Undamaged', 'Damaged', 'ForParts'],
    description: 'Vehicle condition',
  })
  @IsOptional()
  @IsEnum(ConditionType, { message: 'validation.conditionTypeEnum' })
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
    message: 'validation.maxEquipmentOptions',
  })
  equipment?: string[];

  @ApiPropertyOptional({
    description: 'Blurhash of the cover image',
    example: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  cover_blur_hash?: string;

  @ApiPropertyOptional({
    description: 'Blurhash per image URL, same order as images; null when unknown',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  image_blur_hashes?: (string | null)[];

  @ApiPropertyOptional({
    type: () => CreateVehicleDto,
    description: 'Vehicle details',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateVehicleDto)
  vehicle?: CreateVehicleDto;

  @ApiPropertyOptional({
    enum: constants.listingCategories,
    description: 'Must match existing listing category if sent',
  })
  @IsOptional()
  @IsEnum(ListingCategory, { message: 'validation.listingCategory' })
  category?: ListingCategory;

  @ApiPropertyOptional({ type: () => UpdateTireDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateTireDto)
  tire?: UpdateTireDto;

  @ApiPropertyOptional({
    example: '999md',
    description: 'Partner parser code (admin only; set together with partner_listing_external_key)',
    maxLength: 32,
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  partner_source_code?: string | null;

  @ApiPropertyOptional({
    example: '12345678',
    description: 'External listing id on partner site (admin only)',
    maxLength: 64,
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  partner_listing_external_key?: string | null;

  @ApiPropertyOptional({
    example: 'https://example.com/listing/1',
    description:
      'Canonical partner listing page URL (admin only; https only; requires partner keys when set to a non-null value)',
    maxLength: 2048,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  partner_listing_canonical_url?: string | null;
}
