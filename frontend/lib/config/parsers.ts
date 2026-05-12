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
  autoCreateBrands?: boolean;
  autoCreateModels?: boolean;
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
  registrySyncEnabled?: boolean;
}

const chisinauAliases = [
  'chisinau',
  'kishinev',
  'kishineu',
  'kishineov',
  'kishinau',
  'кишинев',
  'кишинёв',
  'кишинэу',
];

export const parsersConfig: ParserConfigItem[] = [
  {
    code: 'cipauto',
    label: 'CipAuto.md',
    domain: 'cipauto.md',
    supportedRunTypes: ['plp', 'pdp'],
    scanInputMode: 'pages',
    adminAvailability: 'enabled',
    releaseStage: 'released',
    isVisibleInAdmin: true,
    manualRunEnabled: true,
    schedulerEnabled: true,
    cliScript: 'cipauto-import/cli.ts',
    plpMode: 'mono',
    plpDataPath: 'runtime/parsing/cipauto/cipauto-current-plp.json',
    pdpDefaults: {
      listingStatus: 'active',
      registrationType: 'Local',
      defaultHp: 100,
      delayMs: 3000,
      resume: false,
      dryRun: false,
      removeClosed: false,
      onlyFailed: false,
      updateExisting: false,
      autoCreateBrands: false,
      autoCreateModels: false,
    },
    defaultPdpCity: 'Chișinău',
    defaultPdpCityNames: chisinauAliases,
    availabilityProbe: {
      sourceUrl: 'https://cipauto.md',
      sourceUrlEnvVar: 'CIPAUTO_BASE_URL',
      plpFirstPagePath: '/catalog-auto/',
      plpPagePathTemplate: '/catalog-auto/page/{page}/?sort=newest',
      defaultPageProbeCount: 3,
      timeoutMs: 15000,
    },
    registrySyncEnabled: true,
  },
  {
    code: '999md',
    label: '999.md',
    domain: '999.md',
    supportedRunTypes: ['plp', 'pdp'],
    scanInputMode: 'profile_login',
    adminAvailability: 'enabled',
    releaseStage: 'released',
    isVisibleInAdmin: true,
    manualRunEnabled: true,
    schedulerEnabled: true,
    cliScript: '999md-import/cli.ts',
    plpMode: 'multi',
    pdpDefaults: {
      listingStatus: 'active',
      registrationType: 'Local',
      defaultHp: 100,
      delayMs: 3000,
      resume: false,
      dryRun: false,
      removeClosed: false,
      onlyFailed: false,
      updateExisting: false,
      autoCreateBrands: false,
      autoCreateModels: false,
    },
    defaultPdpCity: 'Chișinău',
    defaultPdpCityNames: chisinauAliases,
    availabilityProbe: {
      sourceUrl: 'https://999.md',
      plpFirstPagePath: '/ro/',
      plpPagePathTemplate: '/ro/?probe={page}',
      defaultPageProbeCount: 3,
      timeoutMs: 15000,
    },
    registrySyncEnabled: true,
  },
  {
    code: 'autooutlet',
    label: 'AutoOutlet.md',
    domain: 'autooutlet.md',
    supportedRunTypes: ['plp', 'pdp'],
    scanInputMode: 'pages',
    adminAvailability: 'enabled',
    releaseStage: 'prepared',
    isVisibleInAdmin: true,
    manualRunEnabled: true,
    schedulerEnabled: false,
    cliScript: 'autooutlet-import/cli.ts',
    plpMode: 'mono',
    plpDataPath: 'runtime/parsing/autooutlet/autooutlet-current-plp.json',
    pdpDefaults: {
      listingStatus: 'paused',
      registrationType: 'Local',
      defaultHp: 100,
      delayMs: 3000,
      resume: false,
      dryRun: false,
      removeClosed: false,
      onlyFailed: false,
      updateExisting: false,
      autoCreateBrands: false,
      autoCreateModels: false,
    },
    defaultPdpCity: 'Chișinău',
    defaultPdpCityNames: chisinauAliases,
    availabilityProbe: {
      sourceUrl: 'https://autooutlet.md',
      sourceUrlEnvVar: 'AUTOOUTLET_BASE_URL',
      plpFirstPagePath: '/catalog-auto/?sort=newest',
      plpPagePathTemplate: '/catalog-auto/page/{page}/?sort=newest',
      defaultPageProbeCount: 2,
      timeoutMs: 15000,
    },
    registrySyncEnabled: true,
  },
];
