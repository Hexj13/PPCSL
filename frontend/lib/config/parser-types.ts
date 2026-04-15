export type ParserRunType = 'plp' | 'pdp';

export type ParserAdminAvailability = 'enabled' | 'disabled' | 'hidden';

export type ParserReleaseStage = 'released' | 'prepared' | 'draft';
export type ParserPlpMode = 'mono' | 'multi';

export interface ParserPdpDefaultsConfig {
  listingStatus?: 'active' | 'paused';
  registrationType?: string;
  defaultHp?: number;
  delayMs?: number;
  resume?: boolean;
  dryRun?: boolean;
  removeClosed?: boolean;
  onlyFailed?: boolean;
  updateExisting?: boolean;
}

export interface ParserAvailabilityProbeConfig {
  sourceUrl: string;
  sourceUrlEnvVar?: string;
  plpFirstPagePath?: string;
  plpPagePathTemplate?: string;
  defaultPageProbeCount?: number;
  timeoutMs?: number;
}

export interface ParserConfigItem {
  code: string;
  label: string;
  domain: string;
  supportedRunTypes: ParserRunType[];
  scanInputMode?: 'pages' | 'profile_login';
  adminAvailability: ParserAdminAvailability;
  releaseStage: ParserReleaseStage;
  isVisibleInAdmin: boolean;
  manualRunEnabled: boolean;
  schedulerEnabled: boolean;
  cliScript: string;
  plpMode: ParserPlpMode;
  plpDataPath?: string;
  pdpDefaults?: ParserPdpDefaultsConfig;
  defaultPdpCity?: string;
  defaultPdpCityNames?: string[];
  availabilityProbe?: ParserAvailabilityProbeConfig;
}
