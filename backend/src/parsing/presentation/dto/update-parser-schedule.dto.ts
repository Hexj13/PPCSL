import { Type } from 'class-transformer';
import { IsIn, IsInt, IsObject, IsOptional, IsString, Min, ValidateIf } from 'class-validator';

export class UpdateParserScheduleDto {
  @IsOptional()
  @IsIn(['every_n_hours', 'daily', 'weekly', 'custom'])
  frequencyPreset?: string;

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

  @IsOptional()
  @IsObject()
  configSnapshot?: Record<string, unknown>;
}
