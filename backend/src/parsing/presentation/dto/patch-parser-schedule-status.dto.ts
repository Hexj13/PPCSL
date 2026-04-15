import { IsIn } from 'class-validator';

import type { ParserScheduleStatus } from '../../domain/types';

export class PatchParserScheduleStatusDto {
  @IsIn(['active', 'deactivated'])
  status!: ParserScheduleStatus;
}
