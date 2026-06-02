import type { ParserRunType, ParserTargetEnv } from '../domain/types';

export interface ParsingRunBucket {
  parserCode: string;
  runType: ParserRunType;
  targetEnv: ParserTargetEnv;
  tracked: boolean;
}
