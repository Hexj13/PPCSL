import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
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

  @IsIn(['every_n_hours', 'daily', 'weekly', 'custom'])
  frequencyPreset!: string;

  @ValidateIf((o) => o.frequencyPreset === 'every_n_hours')
  @Type(() => Number)
  @IsInt()
  @Min(1)
  everyNHours?: number;

  @ValidateIf((o) => o.frequencyPreset === 'custom')
  @IsString()
  cronExpression?: string;

  @IsOptional()
  @IsString()
  presetTime?: string;

  @IsOptional()
  @IsString()
  presetWeekday?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsObject()
  configSnapshot!: Record<string, unknown>;
}
