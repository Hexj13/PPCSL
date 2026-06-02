import type { AssignUserValidationState } from '@/components/ListingForm/useAssignUserValidation';
import type { ParserSchedule } from '@/lib/api/admin-parsing';

import type { ScheduleFormState } from './parsing-tab-form-types';
import { isValidCronExpression, isValidPresetTime } from './parsing-tab-utils';

export type ScheduleSubmitValidationErrorKey =
  | 'admin.parsing.assignUserRequired'
  | 'admin.parsing.cityRequired'
  | 'admin.parsing.plpFileRequired'
  | 'admin.parsing.loginRequired'
  | 'admin.parsing.weekdayRequired'
  | 'admin.parsing.presetTimeRequired'
  | 'admin.parsing.everyNDaysRequired'
  | 'admin.parsing.cronExpressionInvalid';

type ValidateScheduleSubmitParams = {
  scheduleForm: ScheduleFormState;
  schedulePlpScanInputMode: 'pages' | 'profile_login';
  scheduleAssignValidation: AssignUserValidationState;
  editingSchedule: ParserSchedule | null;
};

export function getScheduleSubmitValidationErrorKey({
  scheduleForm,
  schedulePlpScanInputMode,
  scheduleAssignValidation,
  editingSchedule,
}: ValidateScheduleSubmitParams): ScheduleSubmitValidationErrorKey | null {
  if (
    !editingSchedule &&
    scheduleForm.runType === 'pdp' &&
    scheduleAssignValidation.status !== 'valid'
  ) {
    return 'admin.parsing.assignUserRequired';
  }
  if (scheduleForm.runType === 'pdp' && !scheduleForm.pdpCity.trim()) {
    return 'admin.parsing.cityRequired';
  }
  if (scheduleForm.runType === 'pdp' && !scheduleForm.pdpPlpFileKey.trim()) {
    return 'admin.parsing.plpFileRequired';
  }
  if (
    scheduleForm.runType === 'plp' &&
    schedulePlpScanInputMode === 'profile_login' &&
    !scheduleForm.plpLogin.trim()
  ) {
    return 'admin.parsing.loginRequired';
  }
  if (scheduleForm.frequencyPreset === 'weekly' && !scheduleForm.presetWeekday) {
    return 'admin.parsing.weekdayRequired';
  }
  if (
    (scheduleForm.frequencyPreset === 'daily' ||
      scheduleForm.frequencyPreset === 'weekly' ||
      scheduleForm.frequencyPreset === 'every_n_days') &&
    !isValidPresetTime(scheduleForm.presetTime)
  ) {
    return 'admin.parsing.presetTimeRequired';
  }
  if (
    scheduleForm.frequencyPreset === 'every_n_days' &&
    (!Number.isInteger(scheduleForm.everyNDays) ||
      scheduleForm.everyNDays < 1 ||
      scheduleForm.everyNDays > 30)
  ) {
    return 'admin.parsing.everyNDaysRequired';
  }
  if (
    scheduleForm.frequencyPreset === 'custom' &&
    !isValidCronExpression(scheduleForm.cronExpression)
  ) {
    return 'admin.parsing.cronExpressionInvalid';
  }
  return null;
}

type ScheduleWriteTimingFields = {
  frequencyPreset: ScheduleFormState['frequencyPreset'];
  everyNHours?: number;
  everyNDays?: number;
  presetTime?: string;
  presetWeekday?: string;
  cronExpression?: string;
  timezone?: string;
};

export function buildScheduleWriteTimingFields(
  scheduleForm: ScheduleFormState,
  shouldShowScheduleTimezoneField: boolean,
): ScheduleWriteTimingFields {
  return {
    frequencyPreset: scheduleForm.frequencyPreset,
    everyNHours:
      scheduleForm.frequencyPreset === 'every_n_hours' ? scheduleForm.everyNHours : undefined,
    everyNDays:
      scheduleForm.frequencyPreset === 'every_n_days' ? scheduleForm.everyNDays : undefined,
    presetTime:
      scheduleForm.frequencyPreset === 'daily' ||
      scheduleForm.frequencyPreset === 'weekly' ||
      scheduleForm.frequencyPreset === 'every_n_days'
        ? scheduleForm.presetTime
        : undefined,
    presetWeekday:
      scheduleForm.frequencyPreset === 'weekly' ? scheduleForm.presetWeekday : undefined,
    cronExpression:
      scheduleForm.frequencyPreset === 'custom' ? scheduleForm.cronExpression : undefined,
    timezone: shouldShowScheduleTimezoneField
      ? scheduleForm.timezone.trim() || 'Europe/Chisinau'
      : undefined,
  };
}
