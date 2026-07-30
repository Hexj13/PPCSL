'use client';

import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from 'react';

import type { AssignUserValidationState } from '@/components/ListingForm/useAssignUserValidation';
import { useTranslation } from '@/hooks/useTranslation';
import { adminApi } from '@/lib/api';
import type { ParserCatalogItem, ParserSchedule } from '@/lib/api/admin-parsing';
import type { City } from '@/lib/api/api-types';
import { toast } from '@/lib/toast';

import { parserCatalogDefaultCode } from './parsing-tab-constants';
import type { ScheduleFormState } from './parsing-tab-form-types';
import { buildScheduleConfigSnapshot } from './parsing-tab-schedule-config';
import { scheduleFormStateFromParserSchedule } from './parsing-tab-schedule-form-mapper';
import {
  buildScheduleWriteTimingFields,
  getScheduleSubmitValidationErrorKey,
} from './parsing-tab-schedule-submit';
import {
  getDefaultPdpCity,
  getDefaultPlpScanMode,
  getParserPdpDefaults,
} from './parsing-tab-utils';

type UseParsingTabSchedulesOptions = {
  cities: City[];
  schedulerParserOptions: Array<{ value: string; label: string }>;
  scheduleForm: ScheduleFormState;
  setScheduleForm: Dispatch<SetStateAction<ScheduleFormState>>;
  scheduleAssignValidation: AssignUserValidationState;
  defaultParserCode: string;
  catalogLoading: boolean;
  catalog: ParserCatalogItem[];
  schedulesReload: (_force?: boolean) => void;
  plpRunsReload: (_force?: boolean) => void;
  pdpRunsReload: (_force?: boolean) => void;
};

export function useParsingTabSchedules({
  cities,
  schedulerParserOptions,
  scheduleForm,
  setScheduleForm,
  scheduleAssignValidation,
  defaultParserCode,
  catalogLoading,
  catalog,
  schedulesReload,
  plpRunsReload,
  pdpRunsReload,
}: UseParsingTabSchedulesOptions) {
  const { t } = useTranslation();

  const schedulePlpScanInputMode = useMemo(
    () => catalog.find((item) => item.code === scheduleForm.parserCode)?.scanInputMode ?? 'pages',
    [catalog, scheduleForm.parserCode],
  );

  const shouldShowScheduleTimezoneField =
    scheduleForm.frequencyPreset === 'daily' ||
    scheduleForm.frequencyPreset === 'weekly' ||
    scheduleForm.frequencyPreset === 'every_n_days';

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleCreating, setScheduleCreating] = useState(false);
  const [scheduleRunNowPendingId, setScheduleRunNowPendingId] = useState<string | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<ParserSchedule | null>(null);

  const resetScheduleFormForCreate = useCallback(() => {
    setScheduleForm((prev) => {
      const parserCode =
        schedulerParserOptions[0]?.value ?? prev.parserCode ?? parserCatalogDefaultCode;
      const pdpDefaults = getParserPdpDefaults(parserCode);
      return {
        parserCode,
        runType: 'plp',
        assignedUserId: '',
        frequencyPreset: 'daily',
        everyNHours: 6,
        everyNDays: 1,
        cronExpression: '0 3 * * *',
        presetTime: '',
        presetWeekday: '',
        timezone: 'Europe/Chisinau',
        plpScanMode: getDefaultPlpScanMode(parserCode),
        plpPagesFirst: 1,
        plpPageFrom: 1,
        plpPageTo: 1,
        plpLogin: '',
        plpPageSize: 50,
        plpMaxItems: '',
        plpDelayMs: 3000,
        pdpListingStatus: pdpDefaults.listingStatus,
        pdpPlpFileKey: '',
        pdpLimit: '',
        pdpRegistrationType: pdpDefaults.registrationType,
        pdpDefaultHp: pdpDefaults.defaultHp,
        pdpCity: getDefaultPdpCity(parserCode, cities),
        pdpDelayMs: pdpDefaults.delayMs,
        pdpRemoveClosed: pdpDefaults.removeClosed,
        pdpForceClose: false,
        pdpOnlyFailed: pdpDefaults.onlyFailed,
        pdpUpdateExisting: pdpDefaults.updateExisting,
        pdpCheckUserDuplicatesBeforeCreate: false,
        pdpAutoCreateBrands: pdpDefaults.autoCreateBrands,
        pdpAutoCreateModels: pdpDefaults.autoCreateModels,
      };
    });
  }, [cities, schedulerParserOptions, setScheduleForm]);

  const openScheduleCreateModal = useCallback(() => {
    setEditingSchedule(null);
    resetScheduleFormForCreate();
    setScheduleModalOpen(true);
  }, [resetScheduleFormForCreate]);

  const openScheduleEditModal = useCallback(
    (schedule: ParserSchedule) => {
      setEditingSchedule(schedule);
      setScheduleForm(scheduleFormStateFromParserSchedule(schedule, cities));
      setScheduleModalOpen(true);
    },
    [cities, setScheduleForm],
  );

  const closeScheduleModal = useCallback(() => {
    setScheduleModalOpen(false);
    setEditingSchedule(null);
    setScheduleCreating(false);
  }, []);

  const submitSchedule = useCallback(async () => {
    if (scheduleCreating) {
      return;
    }
    const validationErrorKey = getScheduleSubmitValidationErrorKey({
      scheduleForm,
      schedulePlpScanInputMode,
      scheduleAssignValidation,
      editingSchedule,
    });
    if (validationErrorKey) {
      toast.error(t(validationErrorKey));
      return;
    }
    setScheduleCreating(true);
    try {
      const configSnapshot = buildScheduleConfigSnapshot(scheduleForm, schedulePlpScanInputMode);
      const timingFields = buildScheduleWriteTimingFields(
        scheduleForm,
        shouldShowScheduleTimezoneField,
      );
      if (editingSchedule) {
        await adminApi.updateSchedule(editingSchedule.id, {
          ...timingFields,
          configSnapshot,
        });
        toast.success(t('admin.parsing.scheduleStatusUpdated'));
      } else {
        await adminApi.createSchedule({
          parserCode: scheduleForm.parserCode || defaultParserCode,
          runType: scheduleForm.runType,
          assignedUserId:
            scheduleForm.runType === 'pdp' ? scheduleForm.assignedUserId.trim() : undefined,
          ...timingFields,
          configSnapshot,
        });
        toast.success(t('admin.parsing.scheduleCreated'));
      }
      closeScheduleModal();
      schedulesReload(true);
    } catch {
      toast.error(
        t(
          editingSchedule
            ? 'admin.parsing.scheduleStatusError'
            : 'admin.parsing.scheduleCreateError',
        ),
      );
    } finally {
      setScheduleCreating(false);
    }
  }, [
    closeScheduleModal,
    defaultParserCode,
    editingSchedule,
    scheduleAssignValidation,
    scheduleCreating,
    scheduleForm,
    schedulePlpScanInputMode,
    schedulesReload,
    shouldShowScheduleTimezoneField,
    t,
  ]);

  const confirmDeleteSchedule = useCallback(
    async (deleteSchedule: ParserSchedule | null, onDone: () => void) => {
      if (!deleteSchedule) return;
      try {
        await adminApi.deleteSchedule(deleteSchedule.id);
        toast.success(t('admin.parsing.scheduleDeleted'));
        onDone();
        schedulesReload(true);
      } catch {
        toast.error(t('admin.parsing.scheduleDeleteError'));
      }
    },
    [schedulesReload, t],
  );

  const toggleScheduleStatus = useCallback(
    async (row: ParserSchedule) => {
      const next = row.status === 'active' ? 'deactivated' : 'active';
      try {
        await adminApi.setScheduleStatus(row.id, next);
        toast.success(t('admin.parsing.scheduleStatusUpdated'));
        schedulesReload(true);
      } catch {
        toast.error(t('admin.parsing.scheduleStatusError'));
      }
    },
    [schedulesReload, t],
  );

  const runScheduleNow = useCallback(
    async (row: ParserSchedule) => {
      if (scheduleRunNowPendingId) {
        toast.error(t('admin.parsing.runNowInProgress'));
        return;
      }
      setScheduleRunNowPendingId(row.id);
      try {
        const res = await adminApi.runScheduleNow(row.id);
        if (res.data.runId) {
          toast.success(t('admin.parsing.runNowStarted', { id: res.data.runId }));
        } else {
          toast.error(t('admin.parsing.runNowSkipped'));
        }
        schedulesReload(true);
        plpRunsReload(true);
        pdpRunsReload(true);
      } catch {
        toast.error(t('admin.parsing.runNowError'));
      } finally {
        setScheduleRunNowPendingId(null);
      }
    },
    [pdpRunsReload, plpRunsReload, scheduleRunNowPendingId, schedulesReload, t],
  );

  const scheduleSubmitDisabled =
    catalogLoading ||
    scheduleCreating ||
    (!editingSchedule &&
      scheduleForm.runType === 'pdp' &&
      scheduleAssignValidation.status !== 'valid') ||
    (scheduleForm.runType === 'pdp' && !scheduleForm.pdpPlpFileKey.trim()) ||
    (scheduleForm.runType === 'plp' &&
      schedulePlpScanInputMode === 'profile_login' &&
      !scheduleForm.plpLogin.trim()) ||
    !catalog.some((c) => c.code === scheduleForm.parserCode && c.schedulerEnabled);

  return {
    scheduleModalOpen,
    scheduleCreating,
    scheduleRunNowPendingId,
    editingSchedule,
    openScheduleCreateModal,
    openScheduleEditModal,
    closeScheduleModal,
    submitSchedule,
    confirmDeleteSchedule,
    toggleScheduleStatus,
    runScheduleNow,
    scheduleSubmitDisabled,
  };
}
