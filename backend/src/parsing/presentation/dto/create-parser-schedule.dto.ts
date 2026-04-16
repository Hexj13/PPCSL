import { Type } from 'class-transformer';
import {
  IsDefined,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

import type { ParserRunType } from '../../domain/types';

export class CreateParserScheduleDto {
  @IsOptional()
  @IsString()
  parserCode?: string;

  @IsIn(['plp', 'pdp'])
  runType!: ParserRunType;

  @IsOptional()
  @ValidateIf((o) => o.runType === 'pdp')
  @IsUUID()
  assignedUserId?: string;

  @IsIn(['every_n_hours', 'every_n_days', 'daily', 'weekly', 'custom'])
  frequencyPreset!: string;

  @ValidateIf((o) => o.frequencyPreset === 'every_n_hours')
  @Type(() => Number)
  @IsInt()
  @Min(1)
  everyNHours?: number;

  @ValidateIf((o) => o.frequencyPreset === 'every_n_days')
  @IsDefined()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  everyNDays?: number;

  @ValidateIf((o) => o.frequencyPreset === 'custom')
  @IsString()
  cronExpression?: string;

  @ValidateIf(
    (o) =>
      o.frequencyPreset === 'daily' ||
      o.frequencyPreset === 'weekly' ||
      o.frequencyPreset === 'every_n_days',
  )
  @IsDefined()
  @IsString()
  presetTime?: string;

  @IsOptional()
  @IsString()
  presetWeekday?: string;

  @ValidateIf(
    (o) =>
      o.frequencyPreset === 'daily' ||
      o.frequencyPreset === 'weekly' ||
      o.frequencyPreset === 'every_n_days',
  )
  @IsDefined()
  @IsString()
  timezone?: string;

  @IsObject()
  configSnapshot!: Record<string, unknown>;
}
