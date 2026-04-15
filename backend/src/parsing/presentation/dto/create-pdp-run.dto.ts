import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

import { registrationTypes } from '../../../common/constants';

export class CreatePdpRunDto {
  @IsOptional()
  @IsString()
  parserCode?: string;

  @IsUUID()
  assignedUserId!: string;

  @IsString()
  plpFileKey!: string;

  @IsIn(['active', 'paused'])
  listingStatus!: 'active' | 'paused';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsBoolean()
  resume?: boolean;

  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  @IsOptional()
  @IsBoolean()
  removeClosed?: boolean;

  @IsOptional()
  @IsBoolean()
  onlyFailed?: boolean;

  @IsOptional()
  @IsBoolean()
  updateExisting?: boolean;

  @IsIn(registrationTypes as unknown as string[])
  registrationType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  defaultHp!: number;

  @IsString()
  city!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  delayMs?: number;
}
