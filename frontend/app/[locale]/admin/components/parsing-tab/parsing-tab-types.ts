export type InnerTab = 'plp' | 'pdp' | 'scheduler';
export type PlpScanMode = 'first_n' | 'range' | 'all';

export interface ParsingTabProps {
  isActive: boolean;
}

export type ParsingListFilters = Record<string, never>;

export interface ParserPdpDefaults {
  listingStatus: 'active' | 'paused';
  registrationType: string;
  defaultHp: number;
  delayMs: number;
  resume: boolean;
  dryRun: boolean;
  removeClosed: boolean;
  onlyFailed: boolean;
  updateExisting: boolean;
  autoCreateBrands: boolean;
  autoCreateModels: boolean;
}
