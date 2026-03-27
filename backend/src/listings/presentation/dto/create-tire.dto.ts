import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  Validate,
} from 'class-validator';

import * as constants from '../../../common/constants';
import { TireCondition, TireSeason, TireVehicleType } from '../../../common/types';
import { IsTireAspectRatioConstraint } from '../../../common/validators/is-tire-aspect-ratio.validator';
import { IsTireDiameterInchConstraint } from '../../../common/validators/is-tire-diameter-inch.validator';
import { IsTireWidthMmConstraint } from '../../../common/validators/is-tire-width-mm.validator';

const TIRE_LOAD_INDEX_PATTERN = /^(0|[1-9]\d?|1\d{2}|2[0-6]\d|27[0-9])$/;

export class CreateTireDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  brand_id: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  @IsUUID('4')
  model_id?: string;

  @ApiProperty({ enum: constants.tireVehicleTypes })
  @IsEnum(TireVehicleType)
  tire_vehicle_type: TireVehicleType;

  @ApiProperty({ enum: constants.tireSeasons })
  @IsEnum(TireSeason)
  season: TireSeason;

  @ApiProperty({ enum: constants.tireConditions })
  @IsEnum(TireCondition)
  condition: TireCondition;

  @ApiProperty({
    example: 205,
    minimum: constants.tireWidthMmMin,
    maximum: constants.tireWidthMmMax,
    description: `Multiple of ${constants.tireWidthMmStep}`,
  })
  @Type(() => Number)
  @IsInt()
  @Validate(IsTireWidthMmConstraint)
  width_mm: number;

  @ApiProperty({
    example: 55,
    minimum: constants.tireAspectRatioMin,
    maximum: constants.tireAspectRatioMax,
    description: `Multiple of ${constants.tireAspectRatioStep}`,
  })
  @Type(() => Number)
  @IsInt()
  @Validate(IsTireAspectRatioConstraint)
  aspect_ratio: number;

  @ApiProperty({
    example: 16,
    minimum: constants.tireDiameterInchMin,
    maximum: constants.tireDiameterInchMax,
    description: `Half-inch steps (e.g. 22.5); ${constants.tireDiameterInchMin}–${constants.tireDiameterInchMax} in`,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Validate(IsTireDiameterInchConstraint)
  diameter_inch: number;

  @ApiProperty({
    example: 4,
    minimum: constants.tireQuantityMin,
    maximum: constants.tireQuantityMax,
  })
  @IsInt()
  @Min(constants.tireQuantityMin)
  @Max(constants.tireQuantityMax)
  quantity: number;

  @ApiPropertyOptional({ maxLength: 3, description: 'Numeric load index from 0 to 279' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    const s = String(value).trim();
    return s === '' ? undefined : s;
  })
  @IsString()
  @Matches(TIRE_LOAD_INDEX_PATTERN, { message: 'validation.tireLoadIndexRange' })
  load_index?: string;

  @ApiPropertyOptional({ enum: constants.tireSpeedIndices })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    const s = String(value).trim().toUpperCase();
    return s === '' ? undefined : s;
  })
  @IsString()
  @IsIn([...constants.tireSpeedIndices], { message: 'validation.tireSpeedIndexRange' })
  speed_index?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  studded?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  run_flat?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  reinforced_xl?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  spare_donut?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  tubeless?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  acoustic?: boolean;
}
