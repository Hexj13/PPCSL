import type { ScheduleFormState } from './parsing-tab-form-types';

export function buildScheduleConfigSnapshot(
  scheduleForm: ScheduleFormState,
  schedulePlpScanInputMode: 'pages' | 'profile_login',
): Record<string, unknown> {
  if (scheduleForm.runType === 'plp') {
    const delayMs = scheduleForm.plpDelayMs;
    if (schedulePlpScanInputMode === 'profile_login') {
      return {
        scanMode: 'profile_login',
        login: scheduleForm.plpLogin.trim(),
        pageSize: scheduleForm.plpPageSize,
        maxItems: scheduleForm.plpMaxItems.trim() ? Number(scheduleForm.plpMaxItems) : undefined,
        delayMs,
      };
    }
    if (scheduleForm.plpScanMode === 'all') {
      return {
        scanMode: 'all',
        pages: 9999,
        pageFrom: undefined,
        pageTo: undefined,
        delayMs,
      };
    }
    if (scheduleForm.plpScanMode === 'first_n') {
      return {
        scanMode: 'first_n',
        pages: scheduleForm.plpPagesFirst,
        pageFrom: undefined,
        pageTo: undefined,
        delayMs,
      };
    }
    return {
      scanMode: 'range',
      pages: scheduleForm.plpPageTo,
      pageFrom: scheduleForm.plpPageFrom,
      pageTo: scheduleForm.plpPageTo,
      delayMs,
    };
  }
  return {
    listingStatus: scheduleForm.pdpListingStatus,
    plpFileKey: scheduleForm.pdpPlpFileKey.trim(),
    limit: scheduleForm.pdpLimit.trim() ? Number(scheduleForm.pdpLimit) : undefined,
    onlyFailed: scheduleForm.pdpOnlyFailed,
    updateExisting: scheduleForm.pdpUpdateExisting,
    registrationType: scheduleForm.pdpRegistrationType,
    defaultHp: scheduleForm.pdpDefaultHp,
    city: scheduleForm.pdpCity.trim(),
    delayMs: scheduleForm.pdpDelayMs,
    removeClosed: scheduleForm.pdpRemoveClosed,
    forceClose: scheduleForm.pdpForceClose,
    checkUserDuplicatesBeforeCreate: scheduleForm.pdpCheckUserDuplicatesBeforeCreate,
    autoCreateBrands: scheduleForm.pdpAutoCreateBrands,
    autoCreateModels: scheduleForm.pdpAutoCreateModels,
    dataSource: 'plp_registry',
    resume: false,
    dryRun: false,
  };
}
