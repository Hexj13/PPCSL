import { parserCatalogDefaultCode } from './parsing-tab-constants';
import type { PdpFormState, PlpFormState, ScheduleFormState } from './parsing-tab-form-types';
import type { ParserPdpDefaults, PlpScanMode } from './parsing-tab-types';
import { getDefaultPlpScanMode, getParserPdpDefaults } from './parsing-tab-utils';

const initialPdpDefaults = getParserPdpDefaults(parserCatalogDefaultCode);

export function createInitialPlpForm(): PlpFormState {
  return {
    parserCode: parserCatalogDefaultCode,
    scanMode: getDefaultPlpScanMode(parserCatalogDefaultCode),
    pagesFirst: 1,
    pageFrom: 1,
    pageTo: 1,
    login: '',
    pageSize: 50,
    maxItems: '',
    delayMs: 3000,
    dryRun: false,
  };
}

export function createInitialPdpForm(): PdpFormState {
  return {
    parserCode: parserCatalogDefaultCode,
    plpFileKey: '',
    assignedUserId: '',
    listingStatus: initialPdpDefaults.listingStatus,
    limit: '',
    registrationType: initialPdpDefaults.registrationType,
    defaultHp: initialPdpDefaults.defaultHp,
    city: '',
    delayMs: initialPdpDefaults.delayMs,
    resume: initialPdpDefaults.resume,
    dryRun: initialPdpDefaults.dryRun,
    removeClosed: initialPdpDefaults.removeClosed,
    onlyFailed: initialPdpDefaults.onlyFailed,
    updateExisting: initialPdpDefaults.updateExisting,
    checkUserDuplicatesBeforeCreate: false,
    autoCreateBrands: initialPdpDefaults.autoCreateBrands,
    autoCreateModels: initialPdpDefaults.autoCreateModels,
  };
}

export function createInitialScheduleForm(): ScheduleFormState {
  return {
    parserCode: parserCatalogDefaultCode,
    runType: 'plp',
    assignedUserId: '',
    frequencyPreset: 'daily',
    everyNHours: 6,
    everyNDays: 1,
    cronExpression: '0 3 * * *',
    presetTime: '',
    presetWeekday: '',
    timezone: 'Europe/Chisinau',
    plpScanMode: getDefaultPlpScanMode(parserCatalogDefaultCode),
    plpPagesFirst: 1,
    plpPageFrom: 1,
    plpPageTo: 1,
    plpLogin: '',
    plpPageSize: 50,
    plpMaxItems: '',
    plpDelayMs: 3000,
    pdpListingStatus: initialPdpDefaults.listingStatus,
    pdpPlpFileKey: '',
    pdpLimit: '',
    pdpRegistrationType: initialPdpDefaults.registrationType,
    pdpDefaultHp: initialPdpDefaults.defaultHp,
    pdpCity: '',
    pdpDelayMs: initialPdpDefaults.delayMs,
    pdpRemoveClosed: initialPdpDefaults.removeClosed,
    pdpOnlyFailed: initialPdpDefaults.onlyFailed,
    pdpUpdateExisting: initialPdpDefaults.updateExisting,
    pdpCheckUserDuplicatesBeforeCreate: false,
    pdpAutoCreateBrands: initialPdpDefaults.autoCreateBrands,
    pdpAutoCreateModels: initialPdpDefaults.autoCreateModels,
  };
}

export type { ParserPdpDefaults, PlpScanMode };
