'use client';

import { isAxiosError } from 'axios';
import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import { getRegistrationTypeOptions } from '@/components/ListingForm/listingFormUtils';
import type { AssignUserValidationState } from '@/components/ListingForm/useAssignUserValidation';
import { useTranslation } from '@/hooks/useTranslation';
import { adminApi } from '@/lib/api';
import type { ParserCatalogItem, ParserPlpFileOption } from '@/lib/api/admin-parsing';
import type { ParserSchedule } from '@/lib/api/admin-parsing';
import type { City } from '@/lib/api/api-types';
import { toast } from '@/lib/toast';

import { cipautoParserCode } from './parsing-tab-constants';
import type { PdpFormState, PlpFormState, ScheduleFormState } from './parsing-tab-form-types';
import type { PlpScanMode } from './parsing-tab-types';
import {
  getSelectedOptionLabel,
  getSupportedTimezones,
  getUtcOffsetLabel,
  getUtcOffsetSortKeyMinutes,
} from './parsing-tab-utils';

type UseParsingTabFormsOptions = {
  plpForm: PlpFormState;
  setPlpForm: Dispatch<SetStateAction<PlpFormState>>;
  pdpForm: PdpFormState;
  setPdpForm: Dispatch<SetStateAction<PdpFormState>>;
  scheduleForm: ScheduleFormState;
  setScheduleForm: Dispatch<SetStateAction<ScheduleFormState>>;
  catalog: ParserCatalogItem[];
  cities: City[];
  plpFilesByParser: Record<string, ParserPlpFileOption[]>;
  loadParserPlpFiles: (_parserCode: string) => Promise<void>;
  manualRunParserOptions: Array<{ value: string; label: string }>;
  schedulerParserOptions: Array<{ value: string; label: string }>;
  pdpModalOpen: boolean;
  scheduleModalOpen: boolean;
  editingSchedule: ParserSchedule | null;
  pdpAssignValidation: AssignUserValidationState;
  scheduleAssignValidation: AssignUserValidationState;
};

export function useParsingTabForms({
  plpForm,
  setPlpForm,
  pdpForm,
  setPdpForm,
  scheduleForm,
  setScheduleForm,
  catalog,
  plpFilesByParser,
  loadParserPlpFiles,
  manualRunParserOptions,
  schedulerParserOptions,
  pdpModalOpen,
  scheduleModalOpen,
  editingSchedule,
  pdpAssignValidation,
  scheduleAssignValidation,
}: UseParsingTabFormsOptions) {
  const { t } = useTranslation();
  const registrationTypeOptions = useMemo(() => getRegistrationTypeOptions(t), [t]);

  const [pdpSyncHintLoading, setPdpSyncHintLoading] = useState(false);
  const [pdpSyncHint, setPdpSyncHint] = useState<{ plpLoginMatchesFileKey: boolean } | null>(null);
  const pdpSyncHintRequestIdRef = useRef(0);
  const [schedulePdpSyncHintLoading, setSchedulePdpSyncHintLoading] = useState(false);
  const [schedulePdpSyncHint, setSchedulePdpSyncHint] = useState<{
    plpLoginMatchesFileKey: boolean;
  } | null>(null);
  const schedulePdpSyncHintRequestIdRef = useRef(0);

  const selectedPlpParserLabel = useMemo(
    () => getSelectedOptionLabel(manualRunParserOptions, plpForm.parserCode),
    [manualRunParserOptions, plpForm.parserCode],
  );
  const selectedPdpParserLabel = useMemo(
    () => getSelectedOptionLabel(manualRunParserOptions, pdpForm.parserCode),
    [manualRunParserOptions, pdpForm.parserCode],
  );
  const selectedScheduleParserLabel = useMemo(
    () => getSelectedOptionLabel(schedulerParserOptions, scheduleForm.parserCode),
    [scheduleForm.parserCode, schedulerParserOptions],
  );

  const plpScanInputMode = useMemo(
    () => catalog.find((item) => item.code === plpForm.parserCode)?.scanInputMode ?? 'pages',
    [catalog, plpForm.parserCode],
  );
  const schedulePlpScanInputMode = useMemo(
    () => catalog.find((item) => item.code === scheduleForm.parserCode)?.scanInputMode ?? 'pages',
    [catalog, scheduleForm.parserCode],
  );

  const plpScanModeOptions = useMemo(
    () =>
      plpForm.parserCode === cipautoParserCode
        ? [
            { value: 'first_n' as PlpScanMode, label: t('admin.parsing.scanFirstN') },
            { value: 'all' as PlpScanMode, label: t('admin.parsing.scanAll') },
          ]
        : [
            { value: 'first_n' as PlpScanMode, label: t('admin.parsing.scanFirstN') },
            { value: 'range' as PlpScanMode, label: t('admin.parsing.scanRange') },
            { value: 'all' as PlpScanMode, label: t('admin.parsing.scanAll') },
          ],
    [plpForm.parserCode, t],
  );

  const schedulePlpScanModeOptions = useMemo(
    () =>
      scheduleForm.parserCode === cipautoParserCode
        ? [
            { value: 'first_n' as PlpScanMode, label: t('admin.parsing.scanFirstN') },
            { value: 'all' as PlpScanMode, label: t('admin.parsing.scanAll') },
          ]
        : [
            { value: 'first_n' as PlpScanMode, label: t('admin.parsing.scanFirstN') },
            { value: 'range' as PlpScanMode, label: t('admin.parsing.scanRange') },
            { value: 'all' as PlpScanMode, label: t('admin.parsing.scanAll') },
          ],
    [scheduleForm.parserCode, t],
  );

  const timezoneOptions = useMemo(() => {
    const at = new Date();
    return getSupportedTimezones()
      .map((timezone) => ({
        value: timezone,
        label: `${getUtcOffsetLabel(timezone)} ${timezone}`,
      }))
      .sort((a, b) => {
        const da = getUtcOffsetSortKeyMinutes(a.value, at);
        const db = getUtcOffsetSortKeyMinutes(b.value, at);
        if (da !== db) {
          return da - db;
        }
        return a.value.localeCompare(b.value);
      });
  }, []);

  const scheduleTimezoneOptions = useMemo(() => {
    if (!scheduleForm.timezone) {
      return timezoneOptions;
    }
    if (timezoneOptions.some((option) => option.value === scheduleForm.timezone)) {
      return timezoneOptions;
    }
    const at = new Date();
    return [
      {
        value: scheduleForm.timezone,
        label: `${getUtcOffsetLabel(scheduleForm.timezone)} ${scheduleForm.timezone}`,
      },
      ...timezoneOptions,
    ].sort((a, b) => {
      const da = getUtcOffsetSortKeyMinutes(a.value, at);
      const db = getUtcOffsetSortKeyMinutes(b.value, at);
      if (da !== db) {
        return da - db;
      }
      return a.value.localeCompare(b.value);
    });
  }, [scheduleForm.timezone, timezoneOptions]);

  const scheduleWeekdayOptions = useMemo(
    () => [
      { value: '1', label: t('admin.parsing.weekdayMonday') },
      { value: '2', label: t('admin.parsing.weekdayTuesday') },
      { value: '3', label: t('admin.parsing.weekdayWednesday') },
      { value: '4', label: t('admin.parsing.weekdayThursday') },
      { value: '5', label: t('admin.parsing.weekdayFriday') },
      { value: '6', label: t('admin.parsing.weekdaySaturday') },
      { value: '0', label: t('admin.parsing.weekdaySunday') },
    ],
    [t],
  );

  const isWeeklyPreset = scheduleForm.frequencyPreset === 'weekly';
  const isDailyPreset = scheduleForm.frequencyPreset === 'daily';
  const isEveryNDaysPreset = scheduleForm.frequencyPreset === 'every_n_days';
  const shouldShowSchedulePresetTimeField = isDailyPreset || isWeeklyPreset || isEveryNDaysPreset;
  const shouldShowScheduleTimezoneField = isDailyPreset || isWeeklyPreset || isEveryNDaysPreset;
  const canEditSchedulePresetTime = isDailyPreset || isWeeklyPreset || isEveryNDaysPreset;
  const canEditScheduleTimezone = isDailyPreset || isWeeklyPreset || isEveryNDaysPreset;

  const pdpPlpFileOptions = useMemo(
    () => plpFilesByParser[pdpForm.parserCode] ?? [],
    [plpFilesByParser, pdpForm.parserCode],
  );
  const schedulePdpPlpFileOptions = useMemo(
    () => plpFilesByParser[scheduleForm.parserCode] ?? [],
    [plpFilesByParser, scheduleForm.parserCode],
  );

  const pdpParserPlpMode = useMemo(
    () => catalog.find((item) => item.code === pdpForm.parserCode)?.plpMode ?? 'mono',
    [catalog, pdpForm.parserCode],
  );
  const scheduleParserPlpMode = useMemo(
    () => catalog.find((item) => item.code === scheduleForm.parserCode)?.plpMode ?? 'mono',
    [catalog, scheduleForm.parserCode],
  );

  const pdpPlpFileSelectDisabled = pdpParserPlpMode === 'mono' || pdpPlpFileOptions.length <= 1;
  const schedulePdpPlpFileSelectDisabled =
    scheduleParserPlpMode === 'mono' || schedulePdpPlpFileOptions.length <= 1;

  useEffect(() => {
    void loadParserPlpFiles(pdpForm.parserCode);
  }, [loadParserPlpFiles, pdpForm.parserCode]);

  useEffect(() => {
    void loadParserPlpFiles(scheduleForm.parserCode);
  }, [loadParserPlpFiles, scheduleForm.parserCode]);

  useEffect(() => {
    if (pdpPlpFileOptions.length === 0) {
      return;
    }
    const hasCurrent = pdpPlpFileOptions.some((item) => item.key === pdpForm.plpFileKey);
    if (!hasCurrent) {
      setPdpForm((s) => ({ ...s, plpFileKey: pdpPlpFileOptions[0].key }));
    }
  }, [pdpPlpFileOptions, pdpForm.plpFileKey, setPdpForm]);

  useEffect(() => {
    if (schedulePdpPlpFileOptions.length === 0) {
      return;
    }
    const hasCurrent = schedulePdpPlpFileOptions.some(
      (item) => item.key === scheduleForm.pdpPlpFileKey,
    );
    if (!hasCurrent) {
      setScheduleForm((s) => ({ ...s, pdpPlpFileKey: schedulePdpPlpFileOptions[0].key }));
    }
  }, [schedulePdpPlpFileOptions, scheduleForm.pdpPlpFileKey, setScheduleForm]);

  useEffect(() => {
    if (!pdpModalOpen || !pdpForm.plpFileKey.trim()) {
      setPdpSyncHint(null);
      setPdpSyncHintLoading(false);
      return;
    }
    const rid = (pdpSyncHintRequestIdRef.current += 1);
    setPdpSyncHintLoading(true);
    setPdpSyncHint(null);
    void (async () => {
      try {
        const res = await adminApi.getRegistrySyncHint(pdpForm.parserCode, pdpForm.plpFileKey);
        if (rid !== pdpSyncHintRequestIdRef.current) return;
        setPdpSyncHint({ plpLoginMatchesFileKey: res.data.plpLoginMatchesFileKey });
        setPdpForm((s) => ({ ...s, assignedUserId: res.data.suggestedAssignedUserId ?? '' }));
      } catch (e) {
        if (rid !== pdpSyncHintRequestIdRef.current) return;
        setPdpSyncHint(null);
        setPdpForm((s) => ({ ...s, assignedUserId: '' }));
        const status = isAxiosError(e) ? e.response?.status : undefined;
        if (status === undefined || status >= 500) {
          toast.error(t('admin.parsing.registrySyncHintLoadError'));
        }
      } finally {
        if (rid === pdpSyncHintRequestIdRef.current) {
          setPdpSyncHintLoading(false);
        }
      }
    })();
  }, [pdpModalOpen, pdpForm.parserCode, pdpForm.plpFileKey, setPdpForm, t]);

  useEffect(() => {
    if (
      !scheduleModalOpen ||
      scheduleForm.runType !== 'pdp' ||
      !scheduleForm.pdpPlpFileKey.trim() ||
      editingSchedule
    ) {
      setSchedulePdpSyncHint(null);
      setSchedulePdpSyncHintLoading(false);
      return;
    }
    const rid = (schedulePdpSyncHintRequestIdRef.current += 1);
    setSchedulePdpSyncHintLoading(true);
    setSchedulePdpSyncHint(null);
    void (async () => {
      try {
        const res = await adminApi.getRegistrySyncHint(
          scheduleForm.parserCode,
          scheduleForm.pdpPlpFileKey,
        );
        if (rid !== schedulePdpSyncHintRequestIdRef.current) return;
        setSchedulePdpSyncHint({ plpLoginMatchesFileKey: res.data.plpLoginMatchesFileKey });
        setScheduleForm((s) => ({ ...s, assignedUserId: res.data.suggestedAssignedUserId ?? '' }));
      } catch (e) {
        if (rid !== schedulePdpSyncHintRequestIdRef.current) return;
        setSchedulePdpSyncHint(null);
        setScheduleForm((s) => ({ ...s, assignedUserId: '' }));
        const status = isAxiosError(e) ? e.response?.status : undefined;
        if (status === undefined || status >= 500) {
          toast.error(t('admin.parsing.registrySyncHintLoadError'));
        }
      } finally {
        if (rid === schedulePdpSyncHintRequestIdRef.current) {
          setSchedulePdpSyncHintLoading(false);
        }
      }
    })();
  }, [
    scheduleModalOpen,
    scheduleForm.runType,
    scheduleForm.parserCode,
    scheduleForm.pdpPlpFileKey,
    editingSchedule,
    setScheduleForm,
    t,
  ]);

  return {
    registrationTypeOptions,
    plpForm,
    setPlpForm,
    pdpForm,
    setPdpForm,
    scheduleForm,
    setScheduleForm,
    selectedPlpParserLabel,
    selectedPdpParserLabel,
    selectedScheduleParserLabel,
    plpScanInputMode,
    schedulePlpScanInputMode,
    plpScanModeOptions,
    schedulePlpScanModeOptions,
    scheduleTimezoneOptions,
    scheduleWeekdayOptions,
    shouldShowSchedulePresetTimeField,
    shouldShowScheduleTimezoneField,
    canEditSchedulePresetTime,
    canEditScheduleTimezone,
    pdpPlpFileOptions,
    schedulePdpPlpFileOptions,
    pdpPlpFileSelectDisabled,
    schedulePdpPlpFileSelectDisabled,
    pdpAssignValidation,
    scheduleAssignValidation,
    pdpSyncHintLoading,
    pdpSyncHint,
    schedulePdpSyncHintLoading,
    schedulePdpSyncHint,
  };
}
