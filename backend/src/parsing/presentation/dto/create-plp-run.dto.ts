import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreatePlpRunDto {
  @IsOptional()
  @IsString()
  parserCode?: string;

  @IsOptional()
  @IsUUID()
  assignedUserId?: string;

  @IsOptional()
  @IsIn(['first_n', 'range', 'all'])
  scanMode?: 'first_n' | 'range' | 'all';

  @IsOptional()
  @IsString()
  login?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxItems?: number;

  @ValidateIf((o) => o.scanMode === 'first_n')
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagesFirst?: number;

  @ValidateIf((o) => o.scanMode === 'range')
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageFrom?: number;

  @ValidateIf((o) => o.scanMode === 'range')
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageTo?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  delayMs?: number;

  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
