import type { PlpScanMode } from './parsing-tab-types';

export type ScheduleFrequencyPreset =
  | 'every_n_hours'
  | 'every_n_days'
  | 'daily'
  | 'weekly'
  | 'custom';

export type PlpFormState = {
  parserCode: string;
  scanMode: PlpScanMode;
  pagesFirst: number;
  pageFrom: number;
  pageTo: number;
  login: string;
  pageSize: number;
  maxItems: string;
  delayMs: number;
  dryRun: boolean;
};

export type PdpFormState = {
  parserCode: string;
  plpFileKey: string;
  assignedUserId: string;
  listingStatus: 'active' | 'paused';
  limit: string;
  registrationType: string;
  defaultHp: number;
  city: string;
  delayMs: number;
  resume: boolean;
  dryRun: boolean;
  removeClosed: boolean;
  forceClose: boolean;
  onlyFailed: boolean;
  updateExisting: boolean;
  checkUserDuplicatesBeforeCreate: boolean;
  autoCreateBrands: boolean;
  autoCreateModels: boolean;
};

export type ScheduleFormState = {
  parserCode: string;
  runType: 'plp' | 'pdp';
  assignedUserId: string;
  frequencyPreset: ScheduleFrequencyPreset;
  everyNHours: number;
  everyNDays: number;
  cronExpression: string;
  presetTime: string;
  presetWeekday: string;
  timezone: string;
  plpScanMode: PlpScanMode;
  plpPagesFirst: number;
  plpPageFrom: number;
  plpPageTo: number;
  plpLogin: string;
  plpPageSize: number;
  plpMaxItems: string;
  plpDelayMs: number;
  pdpListingStatus: 'active' | 'paused';
  pdpPlpFileKey: string;
  pdpLimit: string;
  pdpRegistrationType: string;
  pdpDefaultHp: number;
  pdpCity: string;
  pdpDelayMs: number;
  pdpRemoveClosed: boolean;
  pdpForceClose: boolean;
  pdpOnlyFailed: boolean;
  pdpUpdateExisting: boolean;
  pdpCheckUserDuplicatesBeforeCreate: boolean;
  pdpAutoCreateBrands: boolean;
  pdpAutoCreateModels: boolean;
};
