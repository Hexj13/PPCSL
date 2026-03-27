import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsOptional, IsUUID, ValidateIf } from 'class-validator';

import { CreateTireDto } from './create-tire.dto';

export class UpdateTireDto extends PartialType(OmitType(CreateTireDto, ['model_id'] as const)) {
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsUUID('4')
  model_id?: string | null;
}
