import type { ParserSchedule } from '@/lib/api/admin-parsing';
import type { City } from '@/lib/api/api-types';

import { cipautoParserCode } from './parsing-tab-constants';
import type { ScheduleFormState } from './parsing-tab-form-types';
import type { PlpScanMode } from './parsing-tab-types';
import {
  getDefaultPdpCity,
  getDefaultPlpScanMode,
  getParserPdpDefaults,
  parseEveryNDaysFromCron,
  parseEveryNHoursFromCron,
  parsePresetTimeFromCron,
  parsePresetWeekdayFromCron,
  resolveSnapshotAutoCreateBrands,
  resolveSnapshotAutoCreateModels,
} from './parsing-tab-utils';

function resolveScheduleFrequencyPreset(
  schedule: ParserSchedule,
): ScheduleFormState['frequencyPreset'] {
  if (
    schedule.frequency_preset === 'every_n_hours' ||
    schedule.frequency_preset === 'every_n_days' ||
    schedule.frequency_preset === 'daily' ||
    schedule.frequency_preset === 'weekly' ||
    schedule.frequency_preset === 'custom'
  ) {
    return schedule.frequency_preset;
  }
  return 'custom';
}

function resolveSchedulePlpScanMode(
  schedule: ParserSchedule,
  cfg: Record<string, unknown>,
): PlpScanMode {
  if (cfg.scanMode === 'range' || cfg.scanMode === 'all' || cfg.scanMode === 'first_n') {
    if (schedule.parser_code === cipautoParserCode && cfg.scanMode === 'range') {
      return 'all';
    }
    return cfg.scanMode as PlpScanMode;
  }
  return getDefaultPlpScanMode(schedule.parser_code);
}

function resolveSchedulePdpListingStatus(
  cfg: Record<string, unknown>,
  pdpDefaults: ReturnType<typeof getParserPdpDefaults>,
): ScheduleFormState['pdpListingStatus'] {
  if (cfg.listingStatus === 'paused') {
    return 'paused';
  }
  if (cfg.listingStatus === 'active') {
    return 'active';
  }
  return pdpDefaults.listingStatus;
}

export function scheduleFormStateFromParserSchedule(
  schedule: ParserSchedule,
  cities: City[],
): ScheduleFormState {
  const cfg = schedule.config_snapshot ?? {};
  const pdpDefaults = getParserPdpDefaults(schedule.parser_code);

  return {
    parserCode: schedule.parser_code,
    runType: schedule.run_type,
    assignedUserId: schedule.assigned_user_id ?? '',
    frequencyPreset: resolveScheduleFrequencyPreset(schedule),
    everyNHours: parseEveryNHoursFromCron(schedule.cron_expression) ?? 6,
    everyNDays: parseEveryNDaysFromCron(schedule.cron_expression) ?? 1,
    cronExpression: schedule.cron_expression || '0 3 * * *',
    presetTime: parsePresetTimeFromCron(schedule.cron_expression) ?? '',
    presetWeekday: parsePresetWeekdayFromCron(schedule.cron_expression) ?? '',
    timezone: schedule.timezone || 'Europe/Chisinau',
    plpScanMode: resolveSchedulePlpScanMode(schedule, cfg),
    plpPagesFirst: Number(cfg.pages ?? 1),
    plpPageFrom: Number(cfg.pageFrom ?? 1),
    plpPageTo: Number(cfg.pageTo ?? 1),
    plpLogin: String(cfg.login ?? ''),
    plpPageSize: Number(cfg.pageSize ?? 50),
    plpMaxItems: cfg.maxItems == null ? '' : String(cfg.maxItems),
    plpDelayMs: Number(cfg.delayMs ?? 3000),
    pdpListingStatus: resolveSchedulePdpListingStatus(cfg, pdpDefaults),
    pdpPlpFileKey: String(cfg.plpFileKey ?? ''),
    pdpLimit: cfg.limit == null ? '' : String(cfg.limit),
    pdpRegistrationType: String(cfg.registrationType ?? pdpDefaults.registrationType),
    pdpDefaultHp: Number(cfg.defaultHp ?? pdpDefaults.defaultHp),
    pdpCity: String(cfg.city ?? getDefaultPdpCity(schedule.parser_code, cities)),
    pdpDelayMs: Number(cfg.delayMs ?? pdpDefaults.delayMs),
    pdpRemoveClosed:
      schedule.run_type === 'pdp' ? Boolean(cfg.removeClosed) : pdpDefaults.removeClosed,
    pdpForceClose: schedule.run_type === 'pdp' ? Boolean(cfg.forceClose) : false,
    pdpOnlyFailed: Boolean(cfg.onlyFailed),
    pdpUpdateExisting: Boolean(cfg.updateExisting),
    pdpCheckUserDuplicatesBeforeCreate: Boolean(cfg.checkUserDuplicatesBeforeCreate),
    pdpAutoCreateBrands: resolveSnapshotAutoCreateBrands(cfg, pdpDefaults),
    pdpAutoCreateModels: resolveSnapshotAutoCreateModels(cfg, pdpDefaults),
  };
}
