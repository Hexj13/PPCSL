import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
} from 'class-validator';

import { currencies } from '../../common/constants';
import {
  SMART_BODY_TYPE_CHOICES,
  SMART_BUDGET_PRESETS,
  SMART_DRIVING_MODES,
  SMART_FUEL_CHOICES,
  SMART_MILEAGE_PRESETS,
  SMART_PRIORITIES,
  SMART_PURPOSES,
  SMART_SIZES,
  SMART_TRANSMISSION_CHOICES,
  SMART_YEAR_PRESETS,
} from '../domain/smart-selection.types';

export class CreateSmartSelectionDto {
  @ApiProperty({
    type: [String],
    enum: SMART_PURPOSES,
    description: 'Up to 3 usage scenarios',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @IsIn(SMART_PURPOSES, { each: true })
  purposes: (typeof SMART_PURPOSES)[number][];

  @ApiProperty({ enum: SMART_DRIVING_MODES })
  @IsIn(SMART_DRIVING_MODES)
  drivingMode: (typeof SMART_DRIVING_MODES)[number];

  @ApiProperty({ enum: SMART_BUDGET_PRESETS })
  @IsIn(SMART_BUDGET_PRESETS)
  budgetPreset: (typeof SMART_BUDGET_PRESETS)[number];

  @ApiProperty({ enum: currencies })
  @IsEnum(currencies)
  currency: (typeof currencies)[number];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  flexibleBudget?: boolean;

  @ApiProperty({ enum: SMART_SIZES })
  @IsIn(SMART_SIZES)
  size: (typeof SMART_SIZES)[number];

  @ApiProperty({
    type: [String],
    enum: SMART_BODY_TYPE_CHOICES,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(4)
  @IsIn(SMART_BODY_TYPE_CHOICES, { each: true })
  bodyTypes: (typeof SMART_BODY_TYPE_CHOICES)[number][];

  @ApiProperty({ enum: SMART_TRANSMISSION_CHOICES })
  @IsIn(SMART_TRANSMISSION_CHOICES)
  transmission: (typeof SMART_TRANSMISSION_CHOICES)[number];

  @ApiProperty({
    type: [String],
    enum: SMART_FUEL_CHOICES,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(4)
  @IsIn(SMART_FUEL_CHOICES, { each: true })
  fuels: (typeof SMART_FUEL_CHOICES)[number][];

  @ApiProperty({ enum: SMART_YEAR_PRESETS })
  @IsIn(SMART_YEAR_PRESETS)
  yearPreset: (typeof SMART_YEAR_PRESETS)[number];

  @ApiProperty({ enum: SMART_MILEAGE_PRESETS })
  @IsIn(SMART_MILEAGE_PRESETS)
  mileagePreset: (typeof SMART_MILEAGE_PRESETS)[number];

  @ApiProperty({
    type: [String],
    enum: SMART_PRIORITIES,
    description: 'Up to 3 priorities',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @IsIn(SMART_PRIORITIES, { each: true })
  priorities: (typeof SMART_PRIORITIES)[number][];
}
