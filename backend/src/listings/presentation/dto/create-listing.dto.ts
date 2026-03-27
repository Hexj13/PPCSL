import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsArray,
  IsString,
  IsNotEmpty,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  Validate,
  ValidateIf,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidateNested,
} from 'class-validator';

import * as constants from '../../../common/constants';
import {
  ConditionType,
  Currency,
  ListingCategory,
  ListingStatus,
  RegistrationType,
} from '../../../common/types';
import { inferListingCategoryFromPayload } from '../../../common/utils/listing-category.utils';

import { CreateTireDto } from './create-tire.dto';
import { CreateVehicleDto } from './create-vehicle.dto';

@ValidatorConstraint({ name: 'listingImages', async: false })
class ListingImagesConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    return this.getValidationMessage(value, args) === null;
  }

  defaultMessage(args: ValidationArguments): string {
    return this.getValidationMessage(args.value, args) ?? 'validation.listingImagesMinVehicle|2';
  }

  private getValidationMessage(value: unknown, args: ValidationArguments): string | null {
    const dto = args.object as CreateListingDto;
    const category = inferListingCategoryFromPayload(dto);
    const minImages = category === ListingCategory.Tire ? 1 : 2;

    if (!Array.isArray(value)) {
      return category === ListingCategory.Tire
        ? 'validation.listingImagesMinTire|1'
        : 'validation.listingImagesMinVehicle|2';
    }

    if (value.length < minImages) {
      return category === ListingCategory.Tire
        ? 'validation.listingImagesMinTire|1'
        : 'validation.listingImagesMinVehicle|2';
    }

    if (value.length > 20) {
      return 'validation.listingImagesMax|20';
    }

    if (value.some((item) => typeof item !== 'string')) {
      return 'each value in images must be a string';
    }

    return null;
  }
}

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

  @ApiPropertyOptional({
    enum: constants.listingCategories,
    description: 'Listing category; omit for legacy vehicle listings',
  })
  @IsOptional()
  @IsEnum(ListingCategory, { message: 'validation.listingCategory' })
  category?: ListingCategory;

  @ValidateIf((o) => inferListingCategoryFromPayload(o) === ListingCategory.Vehicle)
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => CreateVehicleDto)
  vehicle?: CreateVehicleDto;

  @ValidateIf((o) => inferListingCategoryFromPayload(o) === ListingCategory.Tire)
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => CreateTireDto)
  tire?: CreateTireDto;

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
    description: 'Available in credit (vehicle listings only)',
  })
  @ValidateIf((o) => inferListingCategoryFromPayload(o) === ListingCategory.Vehicle)
  @IsOptional()
  @IsBoolean()
  available_in_credit?: boolean;

  @ApiPropertyOptional({
    example: 5000,
    description: 'Down payment (vehicle listings only)',
    minimum: 0,
    maximum: 999999999,
  })
  @ValidateIf((o) => inferListingCategoryFromPayload(o) === ListingCategory.Vehicle)
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
    description: 'Image URLs: 1–20 for tire listings, 2–20 for vehicle listings',
    type: [String],
    minItems: 1,
    maxItems: 20,
  })
  @Validate(ListingImagesConstraint)
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
    description: 'Mark listing as new (vehicle listings only; tires derive from tire condition)',
  })
  @ValidateIf((o) => inferListingCategoryFromPayload(o) === ListingCategory.Vehicle)
  @IsOptional()
  @IsBoolean()
  is_new?: boolean;

  @ApiPropertyOptional({
    example: 'WBA3A5G59CNP12345',
    description: 'VIN (vehicle listings only)',
    pattern: '^[A-HJ-NPR-Z0-9]{17}$',
  })
  @ValidateIf((o) => inferListingCategoryFromPayload(o) === ListingCategory.Vehicle)
  @IsOptional()
  @IsString()
  @Length(17, 17, { message: 'VIN мора да биде точно 17 карактери' })
  @Matches(/^[A-HJ-NPR-Z0-9]{17}$/i, {
    message: 'VIN мора да содржи само букви и бројки (без I, O, Q)',
  })
  vin?: string;

  @ApiPropertyOptional({
    example: 'Undamaged',
    enum: constants.conditionTypes,
    description: 'Vehicle condition (vehicle listings only)',
  })
  @ValidateIf((o) => inferListingCategoryFromPayload(o) === ListingCategory.Vehicle)
  @IsEnum(ConditionType, { message: 'Состојбата мора да биде Undamaged, Damaged или ForParts' })
  condition?: ConditionType;

  @ApiPropertyOptional({
    example: 'Local',
    enum: constants.registrationTypes,
    description: 'Registration type (vehicle listings only)',
  })
  @ValidateIf((o) => inferListingCategoryFromPayload(o) === ListingCategory.Vehicle)
  @IsEnum(RegistrationType, {
    message: 'validation.registrationType',
  })
  registration_type?: RegistrationType;

  @ApiPropertyOptional({
    example: 150,
    description: 'Horsepower (vehicle listings only)',
    minimum: 1,
    maximum: 9999,
  })
  @ValidateIf((o) => inferListingCategoryFromPayload(o) === ListingCategory.Vehicle)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(1)
  @Max(9999)
  horsepower?: number;

  @ApiPropertyOptional({
    example: 110,
    description: 'Power in kilowatts (vehicle listings only)',
    minimum: 1,
    maximum: 9999,
  })
  @ValidateIf((o) => inferListingCategoryFromPayload(o) === ListingCategory.Vehicle)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9999)
  power_kw?: number;

  @ApiPropertyOptional({
    example: ['air_conditioning', 'navigation', 'parking_sensors'],
    description: 'Array of equipment keys (vehicle listings only, max 40 items)',
    type: [String],
    maxItems: 40,
  })
  @ValidateIf((o) => inferListingCategoryFromPayload(o) === ListingCategory.Vehicle)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(40, {
    message: 'Максимум 40 опции',
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
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Assign listing to a different user (admin only)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'errors.invalidUserId' })
  assignedUserId?: string;
}
