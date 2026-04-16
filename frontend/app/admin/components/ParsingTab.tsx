'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getRegistrationTypeOptions } from '@/components/ListingForm/listingFormUtils';
import {
  type AssignUserValidationState,
  useAssignUserValidation,
} from '@/components/ListingForm/useAssignUserValidation';
import { Dropdown } from '@/components/common/Dropdown';
import { Modal } from '@/components/modals/Modal';
import { useI18n } from '@/components/providers/I18nProvider';
import { usePaginatedData } from '@/hooks/usePaginatedData';
import { useRefreshWhenVisible } from '@/hooks/useRefreshWhenVisible';
import { useTabIndicator } from '@/hooks/useTabIndicator';
import { useTranslation } from '@/hooks/useTranslation';
import { adminApi } from '@/lib/api';
import type {
  ParserCatalogItem,
  ParserPlpFileOption,
  PlpFileInfo,
  ParserRun,
  ParserRunCurrentPlpFile,
  ParserSchedule,
} from '@/lib/api/admin-parsing';
import { citiesApi } from '@/lib/api/api-cities';
import type { City } from '@/lib/api/api-types';
import { toast } from '@/lib/toast';
import { formatAdminTableDateTime } from '@/lib/utils';
import {
  CheckIcon,
  Checkbox,
  ClockIcon,
  HintTooltip,
  InfoBlock,
  Pagination,
  PlayIcon,
  RefreshIcon,
} from '@/ui';

import { AdminActionButton } from './AdminButtons';
import { AdminActionsMenuPortal, AdminConfirmModal } from './AdminTableShared';
import { ParsingPlpFilesTable, ParsingRunsTable } from './ParsingTabTables';
import {
  cipautoParserCode,
  modalFieldLabelClassName,
  modalInputClassName,
  modalPrimaryButtonClassName,
  parserCatalogDefaultCode,
  tableCenteredCellClassName,
  tableCenteredSecondaryCellClassName,
  tableHeaderClassName,
  tablePrimaryButtonClassName,
} from './parsing-tab/parsing-tab-constants';
import type {
  InnerTab,
  ParsingListFilters,
  ParsingTabProps,
  PlpScanMode,
} from './parsing-tab/parsing-tab-types';
import {
  getAvailabilityIndicatorClassName,
  getDefaultPdpCity,
  getDefaultPlpScanMode,
  getParserPdpDefaults,
  getPlpRunFileName,
  getRunStatusClassName,
  getScheduleFrequencyLabel,
  getScheduleStatusClassName,
  getSearchMatchCount,
  getSelectedOptionLabel,
  getSupportedTimezones,
  getUtcOffsetLabel,
  getUtcOffsetSortKeyMinutes,
  isRunActive,
  isValidCronExpression,
  isValidPresetTime,
  parseEveryNDaysFromCron,
  parseEveryNHoursFromCron,
  parsePresetTimeFromCron,
  parsePresetWeekdayFromCron,
  renderHighlightedText,
} from './parsing-tab/parsing-tab-utils';

/* eslint-disable max-lines-per-function, max-lines, complexity -- admin parsing tab orchestration */
export function ParsingTab({ isActive }: ParsingTabProps) {
  const { t } = useTranslation();
  const { locale } = useI18n();
  const plpTabRef = useRef<HTMLButtonElement>(null);
  const pdpTabRef = useRef<HTMLButtonElement>(null);
  const schedulerTabRef = useRef<HTMLButtonElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [cities, setCities] = useState<City[]>([]);
  const citiesRef = useRef<City[]>([]);
  citiesRef.current = cities;
  const registrationTypeOptions = useMemo(() => getRegistrationTypeOptions(t), [t]);
  const cityOptions = useMemo(
    () =>
      cities.map((city) => ({
        value: city.name,
        label: locale === 'ru' && city.nameRu ? `${city.nameRu} (${city.name})` : city.name,
      })),
    [cities, locale],
  );
  const [innerTab, setInnerTab] = useState<InnerTab>('plp');
  const [catalog, setCatalog] = useState<ParserCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [plpFilesByParser, setPlpFilesByParser] = useState<Record<string, ParserPlpFileOption[]>>(
    {},
  );

  const [plpModalOpen, setPlpModalOpen] = useState(false);
  const [pdpModalOpen, setPdpModalOpen] = useState(false);
  const [plpSubmitting, setPlpSubmitting] = useState(false);
  const [pdpSubmitting, setPdpSubmitting] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleCreating, setScheduleCreating] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ParserSchedule | null>(null);

  const [logsModalRun, setLogsModalRun] = useState<ParserRun | null>(null);
  const [logsRunId, setLogsRunId] = useState<string | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);
  const logSeqRef = useRef(0);

  const [reportModalRun, setReportModalRun] = useState<ParserRun | null>(null);
  const [reportJson, setReportJson] = useState<string>('');
  const [plpFileModalOpen, setPlpFileModalOpen] = useState(false);
  const [plpFileData, setPlpFileData] = useState<ParserRunCurrentPlpFile | null>(null);
  const [plpFileLoading, setPlpFileLoading] = useState(false);
  const [logsSearchQuery, setLogsSearchQuery] = useState('');
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [plpFileSearchQuery, setPlpFileSearchQuery] = useState('');

  const [cancelRun, setCancelRun] = useState<ParserRun | null>(null);
  const [deletePlpFileTarget, setDeletePlpFileTarget] = useState<PlpFileInfo | null>(null);
  const [deleteSchedule, setDeleteSchedule] = useState<ParserSchedule | null>(null);
  const [openPlpFileActionsMenu, setOpenPlpFileActionsMenu] = useState<{
    file: PlpFileInfo;
    top: number;
    left: number;
  } | null>(null);
  const [openRunActionsMenu, setOpenRunActionsMenu] = useState<{
    run: ParserRun;
    top: number;
    left: number;
    canOpenFile: boolean;
  } | null>(null);
  const [openScheduleActionsMenu, setOpenScheduleActionsMenu] = useState<{
    id: string;
    top: number;
    left: number;
  } | null>(null);
  const [plpListRefreshCooldown, setPlpListRefreshCooldown] = useState(false);
  const [pdpListRefreshCooldown, setPdpListRefreshCooldown] = useState(false);
  const plpListRefreshCooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pdpListRefreshCooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLogContent = logLines.some((line) => typeof line === 'string' && line.trim().length > 0);

  const defaultParserCode = useMemo(() => catalog[0]?.code ?? parserCatalogDefaultCode, [catalog]);
  const manualRunParserOptions = useMemo(
    () =>
      catalog
        .filter((c) => c.manualRunEnabled)
        .map((c) => ({
          value: c.code,
          label: c.label,
        })),
    [catalog],
  );
  const schedulerParserOptions = useMemo(
    () =>
      catalog
        .filter((c) => c.schedulerEnabled)
        .map((c) => ({
          value: c.code,
          label: c.label,
        })),
    [catalog],
  );
  const initialPdpDefaults = getParserPdpDefaults(parserCatalogDefaultCode);

  const [plpForm, setPlpForm] = useState({
    parserCode: parserCatalogDefaultCode,
    scanMode: getDefaultPlpScanMode(parserCatalogDefaultCode) as PlpScanMode,
    pagesFirst: 1,
    pageFrom: 1,
    pageTo: 1,
    login: '',
    pageSize: 50,
    maxItems: '' as string,
    delayMs: 3000,
    resume: false,
    dryRun: false,
    removeClosed: false,
  });

  const [pdpForm, setPdpForm] = useState({
    parserCode: parserCatalogDefaultCode,
    plpFileKey: '',
    assignedUserId: '',
    listingStatus: initialPdpDefaults.listingStatus,
    limit: '' as string,
    registrationType: initialPdpDefaults.registrationType,
    defaultHp: initialPdpDefaults.defaultHp,
    city: '',
    delayMs: initialPdpDefaults.delayMs,
    resume: initialPdpDefaults.resume,
    dryRun: initialPdpDefaults.dryRun,
    removeClosed: initialPdpDefaults.removeClosed,
    onlyFailed: initialPdpDefaults.onlyFailed,
    updateExisting: initialPdpDefaults.updateExisting,
  });
  const selectedPlpParserLabel = useMemo(
    () => getSelectedOptionLabel(manualRunParserOptions, plpForm.parserCode),
    [manualRunParserOptions, plpForm.parserCode],
  );

  const [scheduleForm, setScheduleForm] = useState({
    parserCode: parserCatalogDefaultCode,
    runType: 'plp' as 'plp' | 'pdp',
    assignedUserId: '',
    frequencyPreset: 'daily' as 'every_n_hours' | 'every_n_days' | 'daily' | 'weekly' | 'custom',
    everyNHours: 6,
    everyNDays: 1,
    cronExpression: '0 3 * * *',
    presetTime: '',
    presetWeekday: '',
    timezone: 'Europe/Chisinau',
    plpScanMode: getDefaultPlpScanMode(parserCatalogDefaultCode) as PlpScanMode,
    plpPagesFirst: 1,
    plpPageFrom: 1,
    plpPageTo: 1,
    plpLogin: '',
    plpPageSize: 50,
    plpMaxItems: '' as string,
    plpDelayMs: 3000,
    plpRemoveClosed: false,
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
  });
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
  const { indicatorRef, indicatorStyle } = useTabIndicator(
    innerTab,
    {
      plp: plpTabRef,
      pdp: pdpTabRef,
      scheduler: schedulerTabRef,
    },
    tabsContainerRef,
  );
  const pdpAssignValidation = useAssignUserValidation(pdpForm.assignedUserId);
  const scheduleAssignValidation = useAssignUserValidation(scheduleForm.assignedUserId);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await adminApi.getCatalog();
        if (cancelled) return;
        setCatalog(res.data.data);
        const firstManualParser = res.data.data.find((item) => item.manualRunEnabled);
        const firstManual = firstManualParser?.code ?? parserCatalogDefaultCode;
        const firstManualScanInputMode = firstManualParser?.scanInputMode ?? 'pages';
        const firstScheduler =
          res.data.data.find((item) => item.schedulerEnabled)?.code ?? firstManual;
        const cityList = citiesRef.current;
        setPlpForm((s) => ({
          ...s,
          parserCode: firstManual,
          scanMode: getDefaultPlpScanMode(firstManual),
          pagesFirst: 1,
          pageFrom: 1,
          pageTo: 1,
          login: '',
          pageSize: 50,
          maxItems: '',
          removeClosed: firstManualScanInputMode === 'pages' ? s.removeClosed : false,
        }));
        setPdpForm((s) => {
          const pdpDefaults = getParserPdpDefaults(firstManual);
          const next = { ...s, parserCode: firstManual };
          next.plpFileKey = '';
          next.listingStatus = pdpDefaults.listingStatus;
          next.registrationType = pdpDefaults.registrationType;
          next.defaultHp = pdpDefaults.defaultHp;
          next.delayMs = pdpDefaults.delayMs;
          next.resume = pdpDefaults.resume;
          next.dryRun = pdpDefaults.dryRun;
          next.removeClosed = pdpDefaults.removeClosed;
          next.onlyFailed = pdpDefaults.onlyFailed;
          next.updateExisting = pdpDefaults.updateExisting;
          if (cityList.length > 0) {
            next.city = getDefaultPdpCity(firstManual, cityList);
          }
          return next;
        });
        setScheduleForm((s) => {
          const pdpDefaults = getParserPdpDefaults(firstScheduler);
          const next = { ...s, parserCode: firstScheduler };
          next.plpScanMode = getDefaultPlpScanMode(firstScheduler);
          next.pdpPlpFileKey = '';
          next.pdpListingStatus = pdpDefaults.listingStatus;
          next.pdpRegistrationType = pdpDefaults.registrationType;
          next.pdpDefaultHp = pdpDefaults.defaultHp;
          next.pdpDelayMs = pdpDefaults.delayMs;
          next.pdpRemoveClosed = pdpDefaults.removeClosed;
          next.pdpOnlyFailed = pdpDefaults.onlyFailed;
          next.pdpUpdateExisting = pdpDefaults.updateExisting;
          if (cityList.length > 0) {
            next.pdpCity = getDefaultPdpCity(firstScheduler, cityList);
          }
          return next;
        });
      } catch {
        toast.error(t('admin.parsing.catalogLoadError'));
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const loadParserPlpFiles = useCallback(
    async (parserCode: string) => {
      if (!parserCode) {
        return;
      }
      try {
        const res = await adminApi.getParserPlpFiles(parserCode);
        setPlpFilesByParser((prev) => ({ ...prev, [parserCode]: res.data.data ?? [] }));
      } catch {
        toast.error(t('admin.parsing.plpFilesLoadError'));
      }
    },
    [t],
  );

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
  }, [pdpPlpFileOptions, pdpForm.plpFileKey]);

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
  }, [schedulePdpPlpFileOptions, scheduleForm.pdpPlpFileKey]);

  useEffect(() => {
    void citiesApi.getAll().then((res) => {
      setCities(res.data);
      if (res.data[0]?.name) {
        setPdpForm((s) => (s.city ? s : { ...s, city: getDefaultPdpCity(s.parserCode, res.data) }));
        setScheduleForm((s) =>
          s.pdpCity ? s : { ...s, pdpCity: getDefaultPdpCity(s.parserCode, res.data) },
        );
      }
    });
  }, []);

  const plpRuns = usePaginatedData<ParserRun, ParsingListFilters>({
    fetchFn: async (pageNum, limitNum) => {
      const response = await adminApi.getPlpRuns(pageNum, limitNum);
      return {
        data: response.data.data,
        meta: response.data.meta,
      };
    },
    limit: 20,
    initialFilters: {} as ParsingListFilters,
  });

  const pdpRuns = usePaginatedData<ParserRun, ParsingListFilters>({
    fetchFn: async (pageNum, limitNum) => {
      const response = await adminApi.getPdpRuns(pageNum, limitNum);
      return {
        data: response.data.data,
        meta: response.data.meta,
      };
    },
    limit: 20,
    initialFilters: {} as ParsingListFilters,
  });

  const onPlpRunsListRefresh = useCallback(async () => {
    setPlpListRefreshCooldown(true);
    if (plpListRefreshCooldownTimerRef.current) {
      clearTimeout(plpListRefreshCooldownTimerRef.current);
    }
    plpListRefreshCooldownTimerRef.current = setTimeout(() => {
      plpListRefreshCooldownTimerRef.current = null;
      setPlpListRefreshCooldown(false);
    }, 1000);

    const ok = await plpRuns.reloadAsync(true);
    if (ok === true) {
      toast.success(t('admin.parsing.listRefreshSuccess'));
    } else if (ok === false) {
      toast.error(t('admin.parsing.listRefreshError'));
    }
  }, [plpRuns, t]);

  const onPdpRunsListRefresh = useCallback(async () => {
    setPdpListRefreshCooldown(true);
    if (pdpListRefreshCooldownTimerRef.current) {
      clearTimeout(pdpListRefreshCooldownTimerRef.current);
    }
    pdpListRefreshCooldownTimerRef.current = setTimeout(() => {
      pdpListRefreshCooldownTimerRef.current = null;
      setPdpListRefreshCooldown(false);
    }, 1000);

    const ok = await pdpRuns.reloadAsync(true);
    if (ok === true) {
      toast.success(t('admin.parsing.listRefreshSuccess'));
    } else if (ok === false) {
      toast.error(t('admin.parsing.listRefreshError'));
    }
  }, [pdpRuns, t]);

  useEffect(() => {
    return () => {
      if (plpListRefreshCooldownTimerRef.current) {
        clearTimeout(plpListRefreshCooldownTimerRef.current);
      }
      if (pdpListRefreshCooldownTimerRef.current) {
        clearTimeout(pdpListRefreshCooldownTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.closest('[data-admin-actions-menu]') ||
        target.closest('[data-admin-actions-trigger]')
      ) {
        return;
      }
      setOpenRunActionsMenu(null);
      setOpenScheduleActionsMenu(null);
      setOpenPlpFileActionsMenu(null);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenRunActionsMenu(null);
        setOpenScheduleActionsMenu(null);
        setOpenPlpFileActionsMenu(null);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  useEffect(() => {
    const closeMenu = () => {
      setOpenRunActionsMenu(null);
      setOpenScheduleActionsMenu(null);
      setOpenPlpFileActionsMenu(null);
    };

    window.addEventListener('resize', closeMenu);
    window.addEventListener('scroll', closeMenu, true);

    return () => {
      window.removeEventListener('resize', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
    };
  }, []);

  const schedules = usePaginatedData<ParserSchedule, ParsingListFilters>({
    fetchFn: async (pageNum, limitNum) => {
      const response = await adminApi.getSchedules(pageNum, limitNum);
      return {
        data: response.data.data,
        meta: response.data.meta,
      };
    },
    limit: 20,
    initialFilters: {} as ParsingListFilters,
  });

  const plpFilesList = usePaginatedData<PlpFileInfo, ParsingListFilters>({
    fetchFn: async (pageNum, limitNum) => {
      const response = await adminApi.getPlpFiles(pageNum, limitNum);
      return {
        data: response.data.data,
        meta: response.data.meta,
      };
    },
    limit: 20,
    initialFilters: {} as ParsingListFilters,
  });

  const onPlpFilesRefresh = useCallback(async () => {
    const ok = await plpFilesList.reloadAsync(true);
    if (ok === false) {
      toast.error(t('admin.parsing.plpFilesLoadError'));
    }
  }, [plpFilesList, t]);

  useRefreshWhenVisible(isActive, () => {
    void plpRuns.reloadAsync(true);
    void pdpRuns.reloadAsync(true);
    void schedules.reloadAsync(true);
    void plpFilesList.reloadAsync(true);
    void (async () => {
      try {
        const res = await adminApi.getCatalog();
        setCatalog(res.data.data);
      } catch {
        toast.error(t('admin.parsing.catalogLoadError'));
      }
    })();
  });

  const plpRunsReloadRef = useRef(plpRuns.reload);
  const pdpRunsReloadRef = useRef(pdpRuns.reload);
  const schedulesReloadRef = useRef(schedules.reload);
  const plpFilesListReloadRef = useRef(plpFilesList.reload);
  plpRunsReloadRef.current = plpRuns.reload;
  pdpRunsReloadRef.current = pdpRuns.reload;
  schedulesReloadRef.current = schedules.reload;
  plpFilesListReloadRef.current = plpFilesList.reload;

  const prevInnerTabRef = useRef<InnerTab | null>(null);
  useEffect(() => {
    const prev = prevInnerTabRef.current;
    prevInnerTabRef.current = innerTab;
    if (prev === null) {
      return;
    }
    if (prev === innerTab) {
      return;
    }
    if (innerTab === 'plp') {
      plpRunsReloadRef.current(true);
      plpFilesListReloadRef.current(true);
    } else if (innerTab === 'pdp') {
      pdpRunsReloadRef.current(true);
    } else {
      schedulesReloadRef.current(true);
    }
  }, [innerTab]);

  const openLogs = useCallback((run: ParserRun) => {
    setLogsModalRun(run);
    setLogsRunId(run.id);
    setLogLines([]);
    setLogsSearchQuery('');
    logSeqRef.current = 0;
  }, []);

  useEffect(() => {
    if (!logsRunId) return;
    let interval: ReturnType<typeof setInterval> | null = null;
    const tick = async () => {
      try {
        const res = await adminApi.getRunLogs(logsRunId, logSeqRef.current);
        const chunks = res.data.data;
        if (chunks.length > 0) {
          const maxSeq = Math.max(...chunks.map((c) => c.seq));
          logSeqRef.current = maxSeq;
          setLogLines((prev) => [
            ...prev,
            ...chunks.flatMap((chunk) =>
              typeof chunk.message === 'string' && chunk.message.trim().length > 0
                ? [chunk.message]
                : [],
            ),
          ]);
        }
        const refreshed = await adminApi.getRun(logsRunId);
        setLogsModalRun(refreshed.data);
        if (!isRunActive(refreshed.data.status) && interval) {
          clearInterval(interval);
          interval = null;
        }
      } catch {
        toast.error(t('admin.parsing.logsLoadError'));
      }
    };
    void tick();
    interval = setInterval(() => void tick(), 2500);
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [logsRunId, t]);

  const openReport = useCallback(
    async (run: ParserRun) => {
      setReportModalRun(run);
      setReportSearchQuery('');
      try {
        const res = await adminApi.getRunReport(run.id);
        setReportJson(JSON.stringify(res.data, null, 2));
      } catch {
        setReportJson('{}');
        toast.error(t('admin.parsing.reportLoadError'));
      }
    },
    [t],
  );

  const openCurrentPlpFile = useCallback(
    async (run: ParserRun) => {
      setPlpFileModalOpen(true);
      setPlpFileData(null);
      setPlpFileLoading(true);
      setPlpFileSearchQuery('');
      try {
        const res = await adminApi.getRunCurrentPlpFile(run.id);
        setPlpFileData(res.data);
      } catch {
        setPlpFileData(null);
        toast.error(t('admin.parsing.fileLoadError'));
      } finally {
        setPlpFileLoading(false);
      }
    },
    [t],
  );

  const openPlpFileFromTable = useCallback(
    async (file: PlpFileInfo) => {
      setPlpFileModalOpen(true);
      setPlpFileData(null);
      setPlpFileLoading(true);
      setPlpFileSearchQuery('');
      try {
        const res = await adminApi.getPlpFileContent(file.parserCode, file.fileKey);
        setPlpFileData(res.data);
      } catch {
        setPlpFileData(null);
        toast.error(t('admin.parsing.fileLoadError'));
      } finally {
        setPlpFileLoading(false);
      }
    },
    [t],
  );

  const downloadPlpFile = useCallback(
    async (file: PlpFileInfo) => {
      try {
        const res = await adminApi.downloadPlpFile(file.parserCode, file.fileKey);
        const blob = new Blob([res.data], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch {
        toast.error(t('admin.parsing.plpFileDownloadError'));
      }
    },
    [t],
  );

  const confirmDeletePlpFile = useCallback(async () => {
    if (!deletePlpFileTarget) {
      return;
    }
    try {
      await adminApi.deletePlpFile(deletePlpFileTarget.parserCode, deletePlpFileTarget.fileKey);
      toast.success(t('admin.parsing.plpFileDeleted'));
      const parserCode = deletePlpFileTarget.parserCode;
      setDeletePlpFileTarget(null);
      await plpFilesList.reloadAsync(false);
      await loadParserPlpFiles(parserCode);
    } catch {
      toast.error(t('admin.parsing.plpFileDeleteError'));
    }
  }, [deletePlpFileTarget, loadParserPlpFiles, plpFilesList, t]);

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
        plpRemoveClosed: false,
        pdpListingStatus: pdpDefaults.listingStatus,
        pdpPlpFileKey: '',
        pdpLimit: '',
        pdpRegistrationType: pdpDefaults.registrationType,
        pdpDefaultHp: pdpDefaults.defaultHp,
        pdpCity: getDefaultPdpCity(parserCode, cities),
        pdpDelayMs: pdpDefaults.delayMs,
        pdpRemoveClosed: pdpDefaults.removeClosed,
        pdpOnlyFailed: pdpDefaults.onlyFailed,
        pdpUpdateExisting: pdpDefaults.updateExisting,
      };
    });
  }, [cities, schedulerParserOptions]);

  const openScheduleCreateModal = useCallback(() => {
    setEditingSchedule(null);
    resetScheduleFormForCreate();
    setScheduleModalOpen(true);
  }, [resetScheduleFormForCreate]);

  const openScheduleEditModal = useCallback(
    (schedule: ParserSchedule) => {
      const cfg = schedule.config_snapshot ?? {};
      const pdpDefaults = getParserPdpDefaults(schedule.parser_code);
      const resolvedFrequencyPreset:
        | 'every_n_hours'
        | 'every_n_days'
        | 'daily'
        | 'weekly'
        | 'custom' =
        schedule.frequency_preset === 'every_n_hours' ||
        schedule.frequency_preset === 'every_n_days' ||
        schedule.frequency_preset === 'daily' ||
        schedule.frequency_preset === 'weekly' ||
        schedule.frequency_preset === 'custom'
          ? schedule.frequency_preset
          : 'custom';
      const parsedEveryNHours = parseEveryNHoursFromCron(schedule.cron_expression);
      const parsedEveryNDays = parseEveryNDaysFromCron(schedule.cron_expression);
      const parsedPresetTime = parsePresetTimeFromCron(schedule.cron_expression);
      const parsedPresetWeekday = parsePresetWeekdayFromCron(schedule.cron_expression);
      setEditingSchedule(schedule);
      setScheduleForm({
        parserCode: schedule.parser_code,
        runType: schedule.run_type,
        assignedUserId: schedule.assigned_user_id ?? '',
        frequencyPreset: resolvedFrequencyPreset,
        everyNHours: parsedEveryNHours ?? 6,
        everyNDays: parsedEveryNDays ?? 1,
        cronExpression: schedule.cron_expression || '0 3 * * *',
        presetTime: parsedPresetTime ?? '',
        presetWeekday: parsedPresetWeekday ?? '',
        timezone: schedule.timezone || 'Europe/Chisinau',
        plpScanMode:
          cfg.scanMode === 'range' || cfg.scanMode === 'all' || cfg.scanMode === 'first_n'
            ? schedule.parser_code === cipautoParserCode && cfg.scanMode === 'range'
              ? 'all'
              : cfg.scanMode
            : getDefaultPlpScanMode(schedule.parser_code),
        plpPagesFirst: Number(cfg.pages ?? 1),
        plpPageFrom: Number(cfg.pageFrom ?? 1),
        plpPageTo: Number(cfg.pageTo ?? 1),
        plpLogin: String(cfg.login ?? ''),
        plpPageSize: Number(cfg.pageSize ?? 50),
        plpMaxItems: cfg.maxItems == null ? '' : String(cfg.maxItems),
        plpDelayMs: Number(cfg.delayMs ?? 3000),
        plpRemoveClosed: Boolean(cfg.removeClosed),
        pdpListingStatus:
          cfg.listingStatus === 'paused'
            ? 'paused'
            : cfg.listingStatus === 'active'
              ? 'active'
              : pdpDefaults.listingStatus,
        pdpPlpFileKey: String(cfg.plpFileKey ?? ''),
        pdpLimit: cfg.limit == null ? '' : String(cfg.limit),
        pdpRegistrationType: String(cfg.registrationType ?? pdpDefaults.registrationType),
        pdpDefaultHp: Number(cfg.defaultHp ?? pdpDefaults.defaultHp),
        pdpCity: String(cfg.city ?? getDefaultPdpCity(schedule.parser_code, cities)),
        pdpDelayMs: Number(cfg.delayMs ?? pdpDefaults.delayMs),
        pdpRemoveClosed: Boolean(cfg.removeClosed),
        pdpOnlyFailed: Boolean(cfg.onlyFailed),
        pdpUpdateExisting: Boolean(cfg.updateExisting),
      });
      setScheduleModalOpen(true);
    },
    [cities],
  );

  const closeScheduleModal = useCallback(() => {
    setScheduleModalOpen(false);
    setEditingSchedule(null);
    setScheduleCreating(false);
  }, []);

  const renderAssignedUserField = (
    value: string,
    onChange: (_value: string) => void,
    validation: AssignUserValidationState,
  ) => {
    const hasError = validation.status === 'error';
    const isValid = validation.status === 'valid';
    const isChecking = validation.status === 'loading';
    const borderClass = isValid
      ? 'border-green-500 focus:border-green-500'
      : hasError
        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
        : '';

    return (
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <label className={modalFieldLabelClassName}>
            {t('admin.parsing.fieldAssignedUserId')}
          </label>
          <HintTooltip ariaLabel={t('admin.parsing.fieldAssignedUserHintButton')}>
            {t('admin.parsing.fieldAssignedUserHint')}
          </HintTooltip>
        </div>
        <div className="relative">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`input-field w-full pr-10 ${borderClass}`}
            placeholder={t('listings.userIdPlaceholder')}
          />
          {isChecking && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-primary-700 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {isValid && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600">
              <CheckIcon className="w-5 h-5" />
            </div>
          )}
        </div>
        {isValid && validation.user && (
          <p className="mt-1.5 text-sm text-green-600">
            {validation.user.displayName} · {t(`listings.userType_${validation.user.type}`)} ·{' '}
            {t('listings.assignUserListingCount', {
              active: validation.user.activeListings,
              limit: validation.user.listingLimit,
            })}
          </p>
        )}
        {validation.status === 'error' && validation.errorKey && (
          <p className="mt-1.5 text-sm text-red-500">{t(validation.errorKey)}</p>
        )}
      </div>
    );
  };

  const renderCheckboxLabelWithHint = (labelKey: string, hintKey: string, hintAriaKey: string) => (
    <span className="inline-flex items-center gap-1.5">
      <span>{t(labelKey)}</span>
      <HintTooltip ariaLabel={t(hintAriaKey)}>{t(hintKey)}</HintTooltip>
    </span>
  );

  const submitPlp = async () => {
    if (plpSubmitting) {
      return;
    }
    if (plpScanInputMode === 'profile_login' && !plpForm.login.trim()) {
      toast.error(t('admin.parsing.loginRequired'));
      return;
    }
    setPlpSubmitting(true);
    try {
      await adminApi.createPlpRun({
        parserCode: plpForm.parserCode || defaultParserCode,
        scanMode: plpScanInputMode === 'pages' ? plpForm.scanMode : undefined,
        pagesFirst:
          plpScanInputMode === 'pages' && plpForm.scanMode === 'first_n'
            ? plpForm.pagesFirst
            : undefined,
        pageFrom:
          plpScanInputMode === 'pages' && plpForm.scanMode === 'range'
            ? plpForm.pageFrom
            : undefined,
        pageTo:
          plpScanInputMode === 'pages' && plpForm.scanMode === 'range' ? plpForm.pageTo : undefined,
        login: plpScanInputMode === 'profile_login' ? plpForm.login.trim() : undefined,
        pageSize: plpScanInputMode === 'profile_login' ? plpForm.pageSize : undefined,
        maxItems:
          plpScanInputMode === 'profile_login' && plpForm.maxItems.trim()
            ? Number(plpForm.maxItems)
            : undefined,
        delayMs: plpForm.delayMs,
        resume: plpForm.resume,
        dryRun: plpForm.dryRun,
        removeClosed: plpScanInputMode === 'pages' ? plpForm.removeClosed : undefined,
      });
      toast.success(t('admin.parsing.runStarted'));
      setPlpModalOpen(false);
      plpRuns.reload(true);
    } catch {
      toast.error(t('admin.parsing.runStartError'));
    } finally {
      setPlpSubmitting(false);
    }
  };

  const submitPdp = async () => {
    if (pdpSubmitting) {
      return;
    }
    if (pdpAssignValidation.status !== 'valid') {
      toast.error(t('admin.parsing.assignUserRequired'));
      return;
    }
    if (!pdpForm.city.trim()) {
      toast.error(t('admin.parsing.cityRequired'));
      return;
    }
    if (!pdpForm.plpFileKey.trim()) {
      toast.error(t('admin.parsing.plpFileRequired'));
      return;
    }
    setPdpSubmitting(true);
    try {
      await adminApi.createPdpRun({
        parserCode: pdpForm.parserCode || defaultParserCode,
        plpFileKey: pdpForm.plpFileKey,
        assignedUserId: pdpForm.assignedUserId.trim(),
        listingStatus: pdpForm.listingStatus,
        limit: pdpForm.limit.trim() ? Number(pdpForm.limit) : undefined,
        resume: pdpForm.resume,
        dryRun: pdpForm.dryRun,
        onlyFailed: pdpForm.onlyFailed,
        updateExisting: pdpForm.updateExisting,
        registrationType: pdpForm.registrationType,
        defaultHp: pdpForm.defaultHp,
        city: pdpForm.city.trim(),
        delayMs: pdpForm.delayMs,
        removeClosed: pdpForm.removeClosed,
      });
      toast.success(t('admin.parsing.runStarted'));
      setPdpModalOpen(false);
      pdpRuns.reload(true);
    } catch {
      toast.error(t('admin.parsing.runStartError'));
    } finally {
      setPdpSubmitting(false);
    }
  };

  const buildScheduleConfigSnapshot = (): Record<string, unknown> => {
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
      if (scheduleForm.plpScanMode === 'first_n') {
        return {
          scanMode: 'first_n',
          pages: scheduleForm.plpPagesFirst,
          pageFrom: undefined,
          pageTo: undefined,
          delayMs,
          removeClosed: scheduleForm.plpRemoveClosed,
        };
      }
      if (scheduleForm.plpScanMode === 'all') {
        return {
          scanMode: 'all',
          pages: 9999,
          pageFrom: undefined,
          pageTo: undefined,
          delayMs,
          removeClosed: scheduleForm.plpRemoveClosed,
        };
      }
      return {
        scanMode: 'range',
        pages: scheduleForm.plpPageTo,
        pageFrom: scheduleForm.plpPageFrom,
        pageTo: scheduleForm.plpPageTo,
        delayMs,
        removeClosed: scheduleForm.plpRemoveClosed,
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
      dataSource: 'plp_registry',
    };
  };

  const submitSchedule = async () => {
    if (scheduleCreating) {
      return;
    }
    if (
      !editingSchedule &&
      scheduleForm.runType === 'pdp' &&
      scheduleAssignValidation.status !== 'valid'
    ) {
      toast.error(t('admin.parsing.assignUserRequired'));
      return;
    }
    if (scheduleForm.runType === 'pdp' && !scheduleForm.pdpCity.trim()) {
      toast.error(t('admin.parsing.cityRequired'));
      return;
    }
    if (scheduleForm.runType === 'pdp' && !scheduleForm.pdpPlpFileKey.trim()) {
      toast.error(t('admin.parsing.plpFileRequired'));
      return;
    }
    if (
      scheduleForm.runType === 'plp' &&
      schedulePlpScanInputMode === 'profile_login' &&
      !scheduleForm.plpLogin.trim()
    ) {
      toast.error(t('admin.parsing.loginRequired'));
      return;
    }
    if (scheduleForm.frequencyPreset === 'weekly' && !scheduleForm.presetWeekday) {
      toast.error(t('admin.parsing.weekdayRequired'));
      return;
    }
    if (
      (scheduleForm.frequencyPreset === 'daily' ||
        scheduleForm.frequencyPreset === 'weekly' ||
        scheduleForm.frequencyPreset === 'every_n_days') &&
      !isValidPresetTime(scheduleForm.presetTime)
    ) {
      toast.error(t('admin.parsing.presetTimeRequired'));
      return;
    }
    if (
      scheduleForm.frequencyPreset === 'every_n_days' &&
      (!Number.isInteger(scheduleForm.everyNDays) ||
        scheduleForm.everyNDays < 1 ||
        scheduleForm.everyNDays > 30)
    ) {
      toast.error(t('admin.parsing.everyNDaysRequired'));
      return;
    }
    if (
      scheduleForm.frequencyPreset === 'custom' &&
      !isValidCronExpression(scheduleForm.cronExpression)
    ) {
      toast.error(t('admin.parsing.cronExpressionInvalid'));
      return;
    }
    setScheduleCreating(true);
    try {
      if (editingSchedule) {
        await adminApi.updateSchedule(editingSchedule.id, {
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
          configSnapshot: buildScheduleConfigSnapshot(),
        });
        toast.success(t('admin.parsing.scheduleStatusUpdated'));
      } else {
        await adminApi.createSchedule({
          parserCode: scheduleForm.parserCode || defaultParserCode,
          runType: scheduleForm.runType,
          assignedUserId:
            scheduleForm.runType === 'pdp' ? scheduleForm.assignedUserId.trim() : undefined,
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
          configSnapshot: buildScheduleConfigSnapshot(),
        });
        toast.success(t('admin.parsing.scheduleCreated'));
      }
      closeScheduleModal();
      schedules.reload(true);
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
  };

  const confirmCancel = async () => {
    if (!cancelRun) return;
    try {
      await adminApi.cancelRun(cancelRun.id);
      toast.success(t('admin.parsing.cancelRequested'));
      setCancelRun(null);
      plpRuns.reload(true);
      pdpRuns.reload(true);
    } catch {
      toast.error(t('admin.parsing.cancelError'));
    }
  };

  const confirmDeleteSchedule = async () => {
    if (!deleteSchedule) return;
    try {
      await adminApi.deleteSchedule(deleteSchedule.id);
      toast.success(t('admin.parsing.scheduleDeleted'));
      setDeleteSchedule(null);
      schedules.reload(true);
    } catch {
      toast.error(t('admin.parsing.scheduleDeleteError'));
    }
  };

  const toggleScheduleStatus = async (row: ParserSchedule) => {
    const next = row.status === 'active' ? 'deactivated' : 'active';
    try {
      await adminApi.setScheduleStatus(row.id, next);
      toast.success(t('admin.parsing.scheduleStatusUpdated'));
      schedules.reload(true);
    } catch {
      toast.error(t('admin.parsing.scheduleStatusError'));
    }
  };

  const runScheduleNow = async (row: ParserSchedule) => {
    try {
      const res = await adminApi.runScheduleNow(row.id);
      if (res.data.runId) {
        toast.success(t('admin.parsing.runNowStarted', { id: res.data.runId }));
      } else {
        toast.error(t('admin.parsing.runNowSkipped'));
      }
      schedules.reload(true);
      plpRuns.reload(true);
      pdpRuns.reload(true);
    } catch {
      toast.error(t('admin.parsing.runNowError'));
    }
  };

  const plpSubmitDisabled =
    catalogLoading ||
    plpSubmitting ||
    !catalog.some((c) => c.code === plpForm.parserCode && c.manualRunEnabled) ||
    (plpScanInputMode === 'profile_login' && !plpForm.login.trim());

  const pdpSubmitDisabled =
    catalogLoading ||
    pdpSubmitting ||
    pdpAssignValidation.status !== 'valid' ||
    !pdpForm.plpFileKey.trim() ||
    !pdpForm.city.trim() ||
    !catalog.some((c) => c.code === pdpForm.parserCode && c.manualRunEnabled);

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

  const getParserLabel = useCallback(
    (parserCode: string) => catalog.find((item) => item.code === parserCode)?.label ?? parserCode,
    [catalog],
  );

  const getTranslatedParsingValue = useCallback(
    (group: string, value: string | null | undefined) => {
      if (!value) return '—';

      const translationKey = `admin.parsing.${group}.${value}`;
      const translated = t(translationKey);

      return translated === translationKey ? value : translated;
    },
    [t],
  );

  const scheduleActionsTarget = useMemo(() => {
    if (!openScheduleActionsMenu) {
      return null;
    }
    return schedules.data.find((schedule) => schedule.id === openScheduleActionsMenu.id) ?? null;
  }, [openScheduleActionsMenu, schedules.data]);

  const copyModalText = useCallback(
    async (text: string, label: string) => {
      try {
        await navigator.clipboard.writeText(text);
        toast.success(t('admin.parsing.copySuccess', { label }));
      } catch {
        toast.error(t('admin.parsing.copyError'));
      }
    },
    [t],
  );

  const renderTextContentModal = useCallback(
    (content: string, query: string, onQueryChange: (_value: string) => void, label: string) => {
      const trimmedQuery = query.trim();
      const matchCount = getSearchMatchCount(content, trimmedQuery);

      return (
        <>
          <div className="mb-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-end">
              <AdminActionButton
                className={modalPrimaryButtonClassName}
                onClick={() => void copyModalText(content, label)}
              >
                {t('admin.parsing.copy')}
              </AdminActionButton>
              <div className="w-full sm:w-80">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => onQueryChange(e.target.value)}
                  placeholder={t('admin.parsing.searchPlaceholder')}
                  className={modalInputClassName}
                />
              </div>
            </div>
            <div className="sm:flex sm:justify-end">
              <p className="mt-1 text-xs text-text-secondary sm:text-right">
                {t('admin.parsing.searchMatches', { count: trimmedQuery ? matchCount : '—' })}
              </p>
            </div>
          </div>
          <pre className="text-xs font-mono whitespace-pre-wrap break-words max-h-[60vh] overflow-y-auto bg-primary-500/5 p-3 rounded-lg border border-primary-500/15">
            {renderHighlightedText(content, trimmedQuery)}
          </pre>
        </>
      );
    },
    [copyModalText, t],
  );

  const tabButtonClassName = (isActive: boolean) =>
    `shrink-0 px-4 py-3 text-base font-semibold transition-all duration-300 relative z-10 whitespace-nowrap flex items-center ${
      isActive
        ? 'text-primary-700 bg-primary-500/10 rounded-t-lg'
        : 'text-primary-700 hover-only:hover:text-primary-900 hover-only:hover:bg-primary-500/10'
    }`;

  return (
    <div className="space-y-6">
      <div className="border-b border-primary-500/20">
        <div ref={tabsContainerRef} className="relative overflow-x-auto scrollbar-hide">
          <div className="relative flex gap-1 min-w-max">
            {(['plp', 'pdp', 'scheduler'] as const).map((tab) => (
              <button
                key={tab}
                ref={tab === 'plp' ? plpTabRef : tab === 'pdp' ? pdpTabRef : schedulerTabRef}
                type="button"
                onClick={() => setInnerTab(tab)}
                className={tabButtonClassName(innerTab === tab)}
              >
                {tab === 'plp'
                  ? t('admin.parsing.subtabPlp')
                  : tab === 'pdp'
                    ? t('admin.parsing.subtabPdp')
                    : t('admin.parsing.subtabScheduler')}
              </button>
            ))}
            <div
              ref={indicatorRef}
              className="absolute bottom-0 h-0.5 bg-primary-700 transition-all duration-300 ease-in-out"
              style={{ left: `${indicatorStyle.left}px`, width: `${indicatorStyle.width}px` }}
            />
          </div>
        </div>
      </div>

      {innerTab === 'plp' && (
        <div>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3 justify-between items-center">
              <h2 className="text-xl font-bold text-primary-900">
                {t('admin.parsing.plpFilesTitle')}
              </h2>
              <AdminActionButton
                variant={plpFilesList.loading ? 'secondary' : 'primary'}
                onClick={() => void onPlpFilesRefresh()}
                disabled={plpFilesList.loading}
                aria-busy={plpFilesList.loading}
              >
                <RefreshIcon className="w-5 h-5 shrink-0" aria-hidden />
                {t('admin.parsing.refresh')}
              </AdminActionButton>
            </div>
            <ParsingPlpFilesTable
              rows={plpFilesList.data}
              loading={plpFilesList.loading}
              t={t}
              tableHeaderClassName={tableHeaderClassName}
              tableCenteredCellClassName={tableCenteredCellClassName}
              tableCenteredSecondaryCellClassName={tableCenteredSecondaryCellClassName}
              tablePrimaryButtonClassName={tablePrimaryButtonClassName}
              openPlpFileActionsMenuKey={
                openPlpFileActionsMenu
                  ? `${openPlpFileActionsMenu.file.parserCode}:${openPlpFileActionsMenu.file.fileKey}`
                  : null
              }
              onPlpFileActionsClose={() => setOpenPlpFileActionsMenu(null)}
              onPlpFileActionsClick={({ file, top, left }) => {
                setOpenRunActionsMenu(null);
                setOpenScheduleActionsMenu(null);
                setOpenPlpFileActionsMenu({ file, top, left });
              }}
            />
            {(plpFilesList.meta?.totalPages ?? 0) > 1 && (
              <Pagination
                currentPage={plpFilesList.page}
                totalPages={plpFilesList.meta?.totalPages ?? 1}
                onPageChange={plpFilesList.setPage}
              />
            )}
          </div>
          <div className="mt-8 space-y-4">
            <div className="flex flex-wrap gap-3 justify-between items-center">
              <h2 className="text-xl font-bold text-primary-900">{t('admin.parsing.plpTitle')}</h2>
              <div className="flex flex-wrap gap-3 items-center">
                <AdminActionButton
                  onClick={() => setPlpModalOpen(true)}
                  disabled={catalogLoading || catalog.length === 0}
                >
                  <PlayIcon className="w-5 h-5 shrink-0" aria-hidden />
                  {t('admin.parsing.startPlp')}
                </AdminActionButton>
                <AdminActionButton
                  variant={plpRuns.loading || plpListRefreshCooldown ? 'secondary' : 'primary'}
                  onClick={() => void onPlpRunsListRefresh()}
                  disabled={plpRuns.loading || plpListRefreshCooldown}
                  aria-busy={plpRuns.loading}
                >
                  <RefreshIcon className="w-5 h-5 shrink-0" aria-hidden />
                  {t('admin.parsing.refresh')}
                </AdminActionButton>
              </div>
            </div>
            <ParsingRunsTable
              rows={plpRuns.data}
              loading={plpRuns.loading}
              runType="plp"
              t={t}
              tableHeaderClassName={tableHeaderClassName}
              tableCenteredCellClassName={tableCenteredCellClassName}
              tableCenteredSecondaryCellClassName={tableCenteredSecondaryCellClassName}
              tablePrimaryButtonClassName={tablePrimaryButtonClassName}
              getParserLabel={getParserLabel}
              getTranslatedParsingValue={getTranslatedParsingValue}
              getPlpRunFileName={getPlpRunFileName}
              getRunStatusClassName={getRunStatusClassName}
              openRunActionsMenuRunId={openRunActionsMenu?.run.id ?? null}
              onRunActionsClose={() => setOpenRunActionsMenu(null)}
              onRunActionsClick={({ run, top, left, canOpenFile }) => {
                setOpenScheduleActionsMenu(null);
                setOpenPlpFileActionsMenu(null);
                setOpenRunActionsMenu({ run, top, left, canOpenFile });
              }}
            />
            {(plpRuns.meta?.totalPages ?? 0) > 1 && (
              <Pagination
                currentPage={plpRuns.page}
                totalPages={plpRuns.meta?.totalPages ?? 1}
                onPageChange={plpRuns.setPage}
              />
            )}
          </div>
        </div>
      )}

      {innerTab === 'pdp' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 justify-between items-center">
            <h2 className="text-xl font-bold text-primary-900">{t('admin.parsing.pdpTitle')}</h2>
            <div className="flex flex-wrap gap-3 items-center">
              <AdminActionButton
                onClick={() => setPdpModalOpen(true)}
                disabled={catalogLoading || catalog.length === 0}
              >
                <PlayIcon className="w-5 h-5 shrink-0" aria-hidden />
                {t('admin.parsing.startPdp')}
              </AdminActionButton>
              <AdminActionButton
                variant={pdpRuns.loading || pdpListRefreshCooldown ? 'secondary' : 'primary'}
                onClick={() => void onPdpRunsListRefresh()}
                disabled={pdpRuns.loading || pdpListRefreshCooldown}
                aria-busy={pdpRuns.loading}
              >
                <RefreshIcon className="w-5 h-5 shrink-0" aria-hidden />
                {t('admin.parsing.refresh')}
              </AdminActionButton>
            </div>
          </div>
          <ParsingRunsTable
            rows={pdpRuns.data}
            loading={pdpRuns.loading}
            runType="pdp"
            t={t}
            tableHeaderClassName={tableHeaderClassName}
            tableCenteredCellClassName={tableCenteredCellClassName}
            tableCenteredSecondaryCellClassName={tableCenteredSecondaryCellClassName}
            tablePrimaryButtonClassName={tablePrimaryButtonClassName}
            getParserLabel={getParserLabel}
            getTranslatedParsingValue={getTranslatedParsingValue}
            getPlpRunFileName={getPlpRunFileName}
            getRunStatusClassName={getRunStatusClassName}
            openRunActionsMenuRunId={openRunActionsMenu?.run.id ?? null}
            onRunActionsClose={() => setOpenRunActionsMenu(null)}
            onRunActionsClick={({ run, top, left, canOpenFile }) => {
              setOpenScheduleActionsMenu(null);
              setOpenPlpFileActionsMenu(null);
              setOpenRunActionsMenu({ run, top, left, canOpenFile });
            }}
          />
          {(pdpRuns.meta?.totalPages ?? 0) > 1 && (
            <Pagination
              currentPage={pdpRuns.page}
              totalPages={pdpRuns.meta?.totalPages ?? 1}
              onPageChange={pdpRuns.setPage}
            />
          )}
        </div>
      )}

      {innerTab === 'scheduler' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 justify-between items-center">
            <h2 className="text-xl font-bold text-primary-900">
              {t('admin.parsing.schedulerTitle')}
            </h2>
            <AdminActionButton
              onClick={openScheduleCreateModal}
              disabled={catalogLoading || !catalog.some((c) => c.schedulerEnabled)}
            >
              <svg
                className="w-4 h-4 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              {t('common.add')}
            </AdminActionButton>
          </div>
          {schedules.loading && schedules.data.length === 0 ? (
            <div className="py-8 text-center text-text-secondary">{t('admin.parsing.loading')}</div>
          ) : schedules.data.length === 0 ? (
            <div className="py-8 text-center text-text-secondary">
              {t('admin.parsing.noSchedules')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse [&_tbody_tr:nth-child(even)]:bg-primary-500/5">
                <thead>
                  <tr className="border-b border-primary-700/30">
                    <th className={`text-center ${tableHeaderClassName}`}>
                      {t('admin.parsing.colParser')}
                    </th>
                    <th className={`text-center ${tableHeaderClassName}`}>
                      {t('admin.parsing.colRunType')}
                    </th>
                    <th className={`text-center ${tableHeaderClassName}`}>
                      {t('admin.parsing.colAssignedUser')}
                    </th>
                    <th className={`text-center ${tableHeaderClassName}`}>
                      {t('admin.parsing.colFrequency')}
                    </th>
                    <th className={`text-center ${tableHeaderClassName}`}>
                      {t('admin.parsing.colStatus')}
                    </th>
                    <th className={`text-center ${tableHeaderClassName}`}>
                      {t('admin.parsing.colNextRun')}
                    </th>
                    <th className={`text-center ${tableHeaderClassName}`}>
                      {t('admin.parsing.colLastRun')}
                    </th>
                    <th className={`text-center ${tableHeaderClassName}`}>
                      <span className="inline-flex items-center justify-center gap-1">
                        <span>{t('admin.parsing.colAvailability')}</span>
                        <HintTooltip
                          ariaLabel={t('admin.parsing.colAvailabilityHintButton')}
                          width="w-72"
                          className="align-middle"
                        >
                          {t('admin.parsing.colAvailabilityHint')}
                        </HintTooltip>
                      </span>
                    </th>
                    <th className={`text-center ${tableHeaderClassName}`}>
                      {t('admin.parsing.colActions')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.data.map((s) => (
                    <tr key={s.id} className="border-b border-primary-700/10">
                      <td className={tableCenteredCellClassName}>
                        {getParserLabel(s.parser_code)}
                      </td>
                      <td className={tableCenteredSecondaryCellClassName}>
                        {getTranslatedParsingValue('runType', s.run_type)}
                      </td>
                      <td className={`${tableCenteredSecondaryCellClassName} max-w-56`}>
                        <div
                          className="mx-auto truncate text-center"
                          title={s.assigned_user_id ?? ''}
                        >
                          {s.assigned_user_id || '—'}
                        </div>
                      </td>
                      <td className={`${tableCenteredSecondaryCellClassName} max-w-52`}>
                        <div className="truncate" title={s.cron_expression}>
                          {getScheduleFrequencyLabel(s, getTranslatedParsingValue)}
                        </div>
                      </td>
                      <td
                        className={`${tableCenteredCellClassName} font-semibold ${getScheduleStatusClassName(s.status)}`}
                      >
                        {getTranslatedParsingValue('status', s.status)}
                      </td>
                      <td className={`${tableCenteredSecondaryCellClassName} whitespace-nowrap`}>
                        {formatAdminTableDateTime(s.next_run_at)}
                      </td>
                      <td className={`${tableCenteredSecondaryCellClassName} whitespace-nowrap`}>
                        {formatAdminTableDateTime(s.last_run_at)}
                      </td>
                      <td className={`${tableCenteredSecondaryCellClassName} max-w-xs`}>
                        <div className="truncate" title={s.resource_availability_summary ?? ''}>
                          <span className="inline-flex max-w-full items-center gap-2 align-middle">
                            <span
                              className={`inline-block h-2 w-2 rounded-full bg-current ${getAvailabilityIndicatorClassName(
                                s.resource_availability_status,
                              )}`}
                              aria-hidden
                            />
                            <span className="truncate">
                              {getTranslatedParsingValue(
                                'availability',
                                s.resource_availability_status,
                              )}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className={`${tableCenteredCellClassName} whitespace-nowrap`}>
                        <div className="relative flex items-center justify-center">
                          <AdminActionButton
                            variant="secondary"
                            data-admin-actions-trigger
                            aria-haspopup="menu"
                            aria-expanded={openScheduleActionsMenu?.id === s.id}
                            aria-label={t('admin.parsing.colActions')}
                            className={tablePrimaryButtonClassName}
                            onClick={(event) => {
                              const rect = event.currentTarget.getBoundingClientRect();
                              setOpenRunActionsMenu(null);
                              setOpenPlpFileActionsMenu(null);
                              setOpenScheduleActionsMenu((current) =>
                                current?.id === s.id
                                  ? null
                                  : {
                                      id: s.id,
                                      top: rect.bottom + 6,
                                      left: rect.right,
                                    },
                              );
                            }}
                          >
                            <span>{t('admin.parsing.colActions')}</span>
                          </AdminActionButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {(schedules.meta?.totalPages ?? 0) > 1 && (
            <Pagination
              currentPage={schedules.page}
              totalPages={schedules.meta?.totalPages ?? 1}
              onPageChange={schedules.setPage}
            />
          )}
        </div>
      )}

      <Modal
        isOpen={plpModalOpen}
        onClose={() => setPlpModalOpen(false)}
        title={t('admin.parsing.plpModalTitle')}
        size="large"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <label className={modalFieldLabelClassName}>{t('admin.parsing.fieldParser')}</label>
            {manualRunParserOptions.length <= 1 ? (
              <div className="input-field w-full cursor-not-allowed opacity-60 pointer-events-none">
                {selectedPlpParserLabel}
              </div>
            ) : (
              <Dropdown
                value={plpForm.parserCode}
                onChange={(value) =>
                  setPlpForm((s) => ({
                    ...s,
                    parserCode: value,
                    scanMode: getDefaultPlpScanMode(value),
                    pagesFirst: 1,
                    pageFrom: 1,
                    pageTo: 1,
                    login: '',
                    pageSize: 50,
                    maxItems: '',
                    removeClosed:
                      (catalog.find((item) => item.code === value)?.scanInputMode ?? 'pages') ===
                      'pages'
                        ? s.removeClosed
                        : false,
                  }))
                }
                options={manualRunParserOptions}
                disabled={catalogLoading}
                renderMenuInPortal
                className="w-full"
              />
            )}
          </div>
          {plpScanInputMode === 'profile_login' ? (
            <>
              <div>
                <label className={modalFieldLabelClassName}>{t('admin.parsing.fieldLogin')}</label>
                <input
                  type="text"
                  className={modalInputClassName}
                  value={plpForm.login}
                  onChange={(e) => setPlpForm((s) => ({ ...s, login: e.target.value }))}
                />
              </div>
              <div>
                <label className={modalFieldLabelClassName}>
                  {t('admin.parsing.fieldPageSize')}
                </label>
                <input
                  type="number"
                  min={1}
                  className={modalInputClassName}
                  value={plpForm.pageSize}
                  onChange={(e) => setPlpForm((s) => ({ ...s, pageSize: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className={modalFieldLabelClassName}>
                  {t('admin.parsing.fieldMaxItems')}
                </label>
                <input
                  type="number"
                  min={1}
                  className={modalInputClassName}
                  value={plpForm.maxItems}
                  onChange={(e) => setPlpForm((s) => ({ ...s, maxItems: e.target.value }))}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className={modalFieldLabelClassName}>
                  {t('admin.parsing.fieldScanMode')}
                </label>
                <Dropdown
                  value={plpForm.scanMode}
                  onChange={(value) =>
                    setPlpForm((s) => ({ ...s, scanMode: value as PlpScanMode }))
                  }
                  options={plpScanModeOptions}
                  renderMenuInPortal
                  className="w-full"
                />
              </div>
              {plpForm.scanMode === 'first_n' ? (
                <div>
                  <label className={modalFieldLabelClassName}>
                    {t('admin.parsing.fieldPagesFirst')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    className={modalInputClassName}
                    value={plpForm.pagesFirst}
                    onChange={(e) =>
                      setPlpForm((s) => ({ ...s, pagesFirst: Number(e.target.value) }))
                    }
                  />
                </div>
              ) : plpForm.scanMode === 'range' && plpForm.parserCode !== cipautoParserCode ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={modalFieldLabelClassName}>
                      {t('admin.parsing.fieldPageFrom')}
                    </label>
                    <input
                      type="number"
                      min={1}
                      className={modalInputClassName}
                      value={plpForm.pageFrom}
                      onChange={(e) =>
                        setPlpForm((s) => ({ ...s, pageFrom: Number(e.target.value) }))
                      }
                    />
                  </div>
                  <div>
                    <label className={modalFieldLabelClassName}>
                      {t('admin.parsing.fieldPageTo')}
                    </label>
                    <input
                      type="number"
                      min={1}
                      className={modalInputClassName}
                      value={plpForm.pageTo}
                      onChange={(e) =>
                        setPlpForm((s) => ({ ...s, pageTo: Number(e.target.value) }))
                      }
                    />
                  </div>
                </div>
              ) : null}
            </>
          )}
          <div>
            <label className={modalFieldLabelClassName}>{t('admin.parsing.fieldDelayMs')}</label>
            <input
              type="number"
              min={0}
              className={modalInputClassName}
              value={plpForm.delayMs}
              onChange={(e) => setPlpForm((s) => ({ ...s, delayMs: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-3">
            <Checkbox
              checked={plpForm.resume}
              onChange={(checked) => setPlpForm((s) => ({ ...s, resume: checked }))}
              label={renderCheckboxLabelWithHint(
                'admin.parsing.fieldResume',
                'admin.parsing.fieldResumeHint',
                'admin.parsing.fieldResumeHintButton',
              )}
              size="sm"
            />
            <Checkbox
              checked={plpForm.dryRun}
              onChange={(checked) => setPlpForm((s) => ({ ...s, dryRun: checked }))}
              label={renderCheckboxLabelWithHint(
                'admin.parsing.fieldDryRun',
                'admin.parsing.fieldDryRunHint',
                'admin.parsing.fieldDryRunHintButton',
              )}
              size="sm"
            />
            {plpScanInputMode === 'pages' && (
              <Checkbox
                checked={plpForm.removeClosed}
                onChange={(checked) => setPlpForm((s) => ({ ...s, removeClosed: checked }))}
                label={renderCheckboxLabelWithHint(
                  'admin.parsing.fieldRemoveClosed',
                  'admin.parsing.fieldRemoveClosedHint',
                  'admin.parsing.fieldRemoveClosedHintButton',
                )}
                size="sm"
              />
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <AdminActionButton
              variant="secondary"
              className="flex-1"
              onClick={() => setPlpModalOpen(false)}
            >
              {t('common.cancel')}
            </AdminActionButton>
            <AdminActionButton
              className="flex-1"
              disabled={plpSubmitDisabled}
              aria-busy={plpSubmitting}
              onClick={() => void submitPlp()}
            >
              <PlayIcon className="w-5 h-5 shrink-0" aria-hidden />
              {t('admin.parsing.submitRun')}
            </AdminActionButton>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={pdpModalOpen}
        onClose={() => setPdpModalOpen(false)}
        title={t('admin.parsing.pdpModalTitle')}
        size="large"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <label className={modalFieldLabelClassName}>{t('admin.parsing.fieldParser')}</label>
            {manualRunParserOptions.length <= 1 ? (
              <div className="input-field w-full cursor-not-allowed opacity-60 pointer-events-none">
                {selectedPdpParserLabel}
              </div>
            ) : (
              <Dropdown
                value={pdpForm.parserCode}
                onChange={(value) =>
                  setPdpForm((s) => {
                    const pdpDefaults = getParserPdpDefaults(value);
                    return {
                      ...s,
                      parserCode: value,
                      plpFileKey: '',
                      listingStatus: pdpDefaults.listingStatus,
                      registrationType: pdpDefaults.registrationType,
                      defaultHp: pdpDefaults.defaultHp,
                      city: getDefaultPdpCity(value, cities),
                      delayMs: pdpDefaults.delayMs,
                      resume: pdpDefaults.resume,
                      dryRun: pdpDefaults.dryRun,
                      removeClosed: pdpDefaults.removeClosed,
                      onlyFailed: pdpDefaults.onlyFailed,
                      updateExisting: pdpDefaults.updateExisting,
                    };
                  })
                }
                options={manualRunParserOptions}
                disabled={catalogLoading}
                renderMenuInPortal
                className="w-full"
              />
            )}
          </div>
          <div>
            <label className={modalFieldLabelClassName}>{t('admin.parsing.fieldPlpFile')}</label>
            <Dropdown
              value={pdpForm.plpFileKey}
              onChange={(value) => setPdpForm((s) => ({ ...s, plpFileKey: value }))}
              options={
                pdpPlpFileOptions.length > 0
                  ? pdpPlpFileOptions.map((item) => ({ value: item.key, label: item.fileName }))
                  : [{ value: '', label: '—' }]
              }
              disabled={pdpPlpFileSelectDisabled}
              renderMenuInPortal
              className="w-full"
            />
          </div>
          {renderAssignedUserField(
            pdpForm.assignedUserId,
            (value) => setPdpForm((s) => ({ ...s, assignedUserId: value })),
            pdpAssignValidation,
          )}
          <div>
            <label className={modalFieldLabelClassName}>
              {t('admin.parsing.fieldListingStatus')}
            </label>
            <Dropdown
              value={pdpForm.listingStatus}
              onChange={(value) =>
                setPdpForm((s) => ({ ...s, listingStatus: value as 'active' | 'paused' }))
              }
              options={[
                { value: 'active', label: t('admin.listingsTab.active') },
                { value: 'paused', label: t('admin.listingsTab.paused') },
              ]}
              renderMenuInPortal
              className="w-full"
            />
          </div>
          <div>
            <label className={modalFieldLabelClassName}>
              {t('admin.parsing.fieldLimitOptional')}
            </label>
            <input
              type="number"
              min={1}
              className={modalInputClassName}
              value={pdpForm.limit}
              onChange={(e) => setPdpForm((s) => ({ ...s, limit: e.target.value }))}
            />
          </div>
          <div>
            <span className={modalFieldLabelClassName}>
              {t('admin.parsing.fieldRegistrationType')}
            </span>
            <Dropdown
              value={pdpForm.registrationType}
              onChange={(value) => setPdpForm((s) => ({ ...s, registrationType: value }))}
              options={registrationTypeOptions}
              renderMenuInPortal
              className="w-full"
            />
          </div>
          <div>
            <span className={modalFieldLabelClassName}>{t('admin.parsing.fieldDefaultHp')}</span>
            <input
              type="number"
              min={1}
              className={modalInputClassName}
              value={pdpForm.defaultHp}
              onChange={(e) => setPdpForm((s) => ({ ...s, defaultHp: Number(e.target.value) }))}
            />
          </div>
          <div>
            <span className={modalFieldLabelClassName}>{t('admin.parsing.fieldCity')}</span>
            <Dropdown
              value={pdpForm.city}
              onChange={(value) => setPdpForm((s) => ({ ...s, city: value }))}
              options={cityOptions}
              renderMenuInPortal
              className="w-full"
            />
          </div>
          <div>
            <span className={modalFieldLabelClassName}>{t('admin.parsing.fieldDelayMs')}</span>
            <input
              type="number"
              min={0}
              className={modalInputClassName}
              value={pdpForm.delayMs}
              onChange={(e) => setPdpForm((s) => ({ ...s, delayMs: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-3">
            <Checkbox
              checked={pdpForm.resume}
              onChange={(checked) => setPdpForm((s) => ({ ...s, resume: checked }))}
              label={renderCheckboxLabelWithHint(
                'admin.parsing.fieldResume',
                'admin.parsing.fieldResumeHint',
                'admin.parsing.fieldResumeHintButton',
              )}
              size="sm"
            />
            <Checkbox
              checked={pdpForm.dryRun}
              onChange={(checked) => setPdpForm((s) => ({ ...s, dryRun: checked }))}
              label={renderCheckboxLabelWithHint(
                'admin.parsing.fieldDryRun',
                'admin.parsing.fieldDryRunHint',
                'admin.parsing.fieldDryRunHintButton',
              )}
              size="sm"
            />
            <Checkbox
              checked={pdpForm.removeClosed}
              onChange={(checked) => setPdpForm((s) => ({ ...s, removeClosed: checked }))}
              label={renderCheckboxLabelWithHint(
                'admin.parsing.fieldRemoveClosed',
                'admin.parsing.fieldRemoveClosedHint',
                'admin.parsing.fieldRemoveClosedHintButton',
              )}
              size="sm"
            />
            <Checkbox
              checked={pdpForm.onlyFailed}
              onChange={(checked) => setPdpForm((s) => ({ ...s, onlyFailed: checked }))}
              label={renderCheckboxLabelWithHint(
                'admin.parsing.fieldOnlyFailed',
                'admin.parsing.fieldOnlyFailedHint',
                'admin.parsing.fieldOnlyFailedHintButton',
              )}
              size="sm"
            />
            <Checkbox
              checked={pdpForm.updateExisting}
              onChange={(checked) => setPdpForm((s) => ({ ...s, updateExisting: checked }))}
              label={renderCheckboxLabelWithHint(
                'admin.parsing.fieldUpdateExisting',
                'admin.parsing.fieldUpdateExistingHint',
                'admin.parsing.fieldUpdateExistingHintButton',
              )}
              size="sm"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <AdminActionButton
              variant="secondary"
              className="flex-1"
              onClick={() => setPdpModalOpen(false)}
            >
              {t('common.cancel')}
            </AdminActionButton>
            <AdminActionButton
              className="flex-1"
              disabled={pdpSubmitDisabled}
              aria-busy={pdpSubmitting}
              onClick={() => void submitPdp()}
            >
              <PlayIcon className="w-5 h-5 shrink-0" aria-hidden />
              {t('admin.parsing.submitRun')}
            </AdminActionButton>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={scheduleModalOpen}
        onClose={closeScheduleModal}
        title={
          editingSchedule
            ? t('admin.parsing.scheduleModalTitleEdit')
            : t('admin.parsing.scheduleModalTitle')
        }
        size="large"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <label className={modalFieldLabelClassName}>{t('admin.parsing.fieldParser')}</label>
            {schedulerParserOptions.length <= 1 ? (
              <div className="input-field w-full cursor-not-allowed opacity-60 pointer-events-none">
                {selectedScheduleParserLabel}
              </div>
            ) : (
              <Dropdown
                value={scheduleForm.parserCode}
                onChange={(value) =>
                  setScheduleForm((s) => {
                    const pdpDefaults = getParserPdpDefaults(value);
                    return {
                      ...s,
                      parserCode: value,
                      plpScanMode: getDefaultPlpScanMode(value),
                      plpPagesFirst: 1,
                      plpPageFrom: 1,
                      plpPageTo: 1,
                      plpLogin: '',
                      plpPageSize: 50,
                      plpMaxItems: '',
                      pdpPlpFileKey: '',
                      plpRemoveClosed:
                        (catalog.find((item) => item.code === value)?.scanInputMode ?? 'pages') ===
                        'pages'
                          ? s.plpRemoveClosed
                          : false,
                      pdpListingStatus: pdpDefaults.listingStatus,
                      pdpRegistrationType: pdpDefaults.registrationType,
                      pdpDefaultHp: pdpDefaults.defaultHp,
                      pdpCity: getDefaultPdpCity(value, cities),
                      pdpDelayMs: pdpDefaults.delayMs,
                      pdpRemoveClosed: pdpDefaults.removeClosed,
                      pdpOnlyFailed: pdpDefaults.onlyFailed,
                      pdpUpdateExisting: pdpDefaults.updateExisting,
                    };
                  })
                }
                options={schedulerParserOptions}
                disabled={catalogLoading || Boolean(editingSchedule)}
                renderMenuInPortal
                className="w-full"
              />
            )}
          </div>
          {scheduleForm.runType === 'pdp' && (
            <div>
              <label className={modalFieldLabelClassName}>{t('admin.parsing.fieldPlpFile')}</label>
              <Dropdown
                value={scheduleForm.pdpPlpFileKey}
                onChange={(value) => setScheduleForm((s) => ({ ...s, pdpPlpFileKey: value }))}
                options={
                  schedulePdpPlpFileOptions.length > 0
                    ? schedulePdpPlpFileOptions.map((item) => ({
                        value: item.key,
                        label: item.fileName,
                      }))
                    : [{ value: '', label: '—' }]
                }
                disabled={schedulePdpPlpFileSelectDisabled}
                renderMenuInPortal
                className="w-full"
              />
            </div>
          )}
          <div>
            <label className={modalFieldLabelClassName}>{t('admin.parsing.fieldRunType')}</label>
            <Dropdown
              value={scheduleForm.runType}
              onChange={(value) => {
                const runType = value as 'plp' | 'pdp';
                setScheduleForm((s) => {
                  const next = {
                    ...s,
                    runType,
                    assignedUserId: runType === 'pdp' ? s.assignedUserId : '',
                  };
                  if (runType === 'pdp' && !s.pdpCity.trim()) {
                    next.pdpCity = getDefaultPdpCity(s.parserCode, cities);
                  }
                  return next;
                });
              }}
              options={[
                { value: 'plp', label: t('admin.parsing.subtabPlp') },
                { value: 'pdp', label: t('admin.parsing.subtabPdp') },
              ]}
              disabled={Boolean(editingSchedule)}
              renderMenuInPortal
              className="w-full"
            />
          </div>
          {scheduleForm.runType === 'pdp' &&
            (editingSchedule ? (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <label className={modalFieldLabelClassName}>
                    {t('admin.parsing.fieldAssignedUserId')}
                  </label>
                </div>
                <input
                  type="text"
                  value={scheduleForm.assignedUserId}
                  readOnly
                  disabled
                  className="input-field w-full opacity-60 cursor-not-allowed"
                />
              </div>
            ) : (
              renderAssignedUserField(
                scheduleForm.assignedUserId,
                (value) => setScheduleForm((s) => ({ ...s, assignedUserId: value })),
                scheduleAssignValidation,
              )
            ))}
          <div>
            <label className={modalFieldLabelClassName}>{t('admin.parsing.fieldFrequency')}</label>
            <Dropdown
              value={scheduleForm.frequencyPreset}
              onChange={(value) =>
                setScheduleForm((s) => ({
                  ...s,
                  frequencyPreset: value as typeof scheduleForm.frequencyPreset,
                }))
              }
              options={[
                { value: 'every_n_hours', label: t('admin.parsing.presetEveryNHours') },
                { value: 'every_n_days', label: t('admin.parsing.presetEveryNDays') },
                { value: 'daily', label: t('admin.parsing.presetDaily') },
                { value: 'weekly', label: t('admin.parsing.presetWeekly') },
                { value: 'custom', label: t('admin.parsing.presetCustom') },
              ]}
              renderMenuInPortal
              className="w-full"
            />
          </div>
          {scheduleForm.frequencyPreset === 'every_n_hours' && (
            <div>
              <label className={modalFieldLabelClassName}>
                {t('admin.parsing.fieldEveryNHours')}
              </label>
              <input
                type="number"
                min={1}
                className={modalInputClassName}
                value={scheduleForm.everyNHours}
                onChange={(e) =>
                  setScheduleForm((s) => ({ ...s, everyNHours: Number(e.target.value) }))
                }
              />
            </div>
          )}
          {scheduleForm.frequencyPreset === 'every_n_days' && (
            <div>
              <label className={modalFieldLabelClassName}>
                {t('admin.parsing.fieldEveryNDays')}
              </label>
              <input
                type="number"
                min={1}
                max={30}
                className={modalInputClassName}
                value={scheduleForm.everyNDays}
                onChange={(e) =>
                  setScheduleForm((s) => ({ ...s, everyNDays: Number(e.target.value) }))
                }
              />
            </div>
          )}
          {scheduleForm.frequencyPreset === 'weekly' && (
            <div>
              <label className={modalFieldLabelClassName}>{t('admin.parsing.fieldWeekday')}</label>
              <Dropdown
                value={scheduleForm.presetWeekday}
                onChange={(value) => setScheduleForm((s) => ({ ...s, presetWeekday: value }))}
                options={scheduleWeekdayOptions}
                placeholder={t('admin.parsing.selectWeekday')}
                renderMenuInPortal
                className="w-full"
              />
            </div>
          )}
          {shouldShowSchedulePresetTimeField && (
            <div>
              <label className={modalFieldLabelClassName}>
                {t('admin.parsing.fieldPresetTime')}
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">
                  <ClockIcon className="w-4 h-4" />
                </span>
                <input
                  type="time"
                  className={`${modalInputClassName} !pl-10 [&::-webkit-calendar-picker-indicator]:hidden`}
                  value={scheduleForm.presetTime}
                  disabled={!canEditSchedulePresetTime}
                  onChange={(e) => setScheduleForm((s) => ({ ...s, presetTime: e.target.value }))}
                />
              </div>
            </div>
          )}
          {scheduleForm.frequencyPreset === 'custom' && (
            <div>
              <label className={modalFieldLabelClassName}>{t('admin.parsing.fieldCron')}</label>
              <input
                className={`${modalInputClassName} font-mono`}
                value={scheduleForm.cronExpression}
                onChange={(e) => setScheduleForm((s) => ({ ...s, cronExpression: e.target.value }))}
              />
            </div>
          )}
          {shouldShowScheduleTimezoneField && (
            <div>
              <label className={modalFieldLabelClassName}>{t('admin.parsing.fieldTimezone')}</label>
              <Dropdown
                value={scheduleForm.timezone}
                onChange={(value) => setScheduleForm((s) => ({ ...s, timezone: value }))}
                options={scheduleTimezoneOptions}
                disabled={!canEditScheduleTimezone}
                searchable
                renderMenuInPortal
                className="w-full"
              />
            </div>
          )}

          {scheduleForm.runType === 'plp' ? (
            <div className="space-y-3 border-t border-primary-500/15 pt-3">
              <p className="font-semibold text-primary-900">
                {t('admin.parsing.schedulePlpConfig')}
              </p>
              {schedulePlpScanInputMode === 'profile_login' ? (
                <>
                  <div>
                    <label className={modalFieldLabelClassName}>
                      {t('admin.parsing.fieldLogin')}
                    </label>
                    <input
                      type="text"
                      className={modalInputClassName}
                      value={scheduleForm.plpLogin}
                      onChange={(e) => setScheduleForm((s) => ({ ...s, plpLogin: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className={modalFieldLabelClassName}>
                      {t('admin.parsing.fieldPageSize')}
                    </label>
                    <input
                      type="number"
                      min={1}
                      className={modalInputClassName}
                      value={scheduleForm.plpPageSize}
                      onChange={(e) =>
                        setScheduleForm((s) => ({ ...s, plpPageSize: Number(e.target.value) }))
                      }
                    />
                  </div>
                  <div>
                    <label className={modalFieldLabelClassName}>
                      {t('admin.parsing.fieldMaxItems')}
                    </label>
                    <input
                      type="number"
                      min={1}
                      className={modalInputClassName}
                      value={scheduleForm.plpMaxItems}
                      onChange={(e) =>
                        setScheduleForm((s) => ({ ...s, plpMaxItems: e.target.value }))
                      }
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className={modalFieldLabelClassName}>
                      {t('admin.parsing.fieldScanMode')}
                    </label>
                    <Dropdown
                      value={scheduleForm.plpScanMode}
                      onChange={(value) =>
                        setScheduleForm((s) => ({
                          ...s,
                          plpScanMode: value as PlpScanMode,
                        }))
                      }
                      options={schedulePlpScanModeOptions}
                      renderMenuInPortal
                      className="w-full"
                    />
                  </div>
                  {scheduleForm.plpScanMode === 'first_n' ? (
                    <div>
                      <label className={modalFieldLabelClassName}>
                        {t('admin.parsing.fieldPagesFirst')}
                      </label>
                      <input
                        type="number"
                        min={1}
                        className={modalInputClassName}
                        value={scheduleForm.plpPagesFirst}
                        onChange={(e) =>
                          setScheduleForm((s) => ({ ...s, plpPagesFirst: Number(e.target.value) }))
                        }
                      />
                    </div>
                  ) : scheduleForm.plpScanMode === 'range' &&
                    scheduleForm.parserCode !== cipautoParserCode ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={modalFieldLabelClassName}>
                          {t('admin.parsing.fieldPageFrom')}
                        </label>
                        <input
                          type="number"
                          min={1}
                          className={modalInputClassName}
                          value={scheduleForm.plpPageFrom}
                          onChange={(e) =>
                            setScheduleForm((s) => ({ ...s, plpPageFrom: Number(e.target.value) }))
                          }
                        />
                      </div>
                      <div>
                        <label className={modalFieldLabelClassName}>
                          {t('admin.parsing.fieldPageTo')}
                        </label>
                        <input
                          type="number"
                          min={1}
                          className={modalInputClassName}
                          value={scheduleForm.plpPageTo}
                          onChange={(e) =>
                            setScheduleForm((s) => ({ ...s, plpPageTo: Number(e.target.value) }))
                          }
                        />
                      </div>
                    </div>
                  ) : null}
                </>
              )}
              <div>
                <label className={modalFieldLabelClassName}>
                  {t('admin.parsing.fieldDelayMs')}
                </label>
                <input
                  type="number"
                  min={0}
                  className={modalInputClassName}
                  value={scheduleForm.plpDelayMs}
                  onChange={(e) =>
                    setScheduleForm((s) => ({ ...s, plpDelayMs: Number(e.target.value) }))
                  }
                />
              </div>
              {schedulePlpScanInputMode === 'pages' && (
                <Checkbox
                  checked={scheduleForm.plpRemoveClosed}
                  onChange={(checked) =>
                    setScheduleForm((s) => ({ ...s, plpRemoveClosed: checked }))
                  }
                  label={renderCheckboxLabelWithHint(
                    'admin.parsing.fieldRemoveClosed',
                    'admin.parsing.fieldRemoveClosedHint',
                    'admin.parsing.fieldRemoveClosedHintButton',
                  )}
                  size="sm"
                />
              )}
            </div>
          ) : (
            <div className="space-y-3 border-t border-primary-500/15 pt-3">
              <p className="font-semibold text-primary-900">
                {t('admin.parsing.schedulePdpConfig')}
              </p>
              <div>
                <span className={modalFieldLabelClassName}>
                  {t('admin.parsing.fieldListingStatus')}
                </span>
                <Dropdown
                  value={scheduleForm.pdpListingStatus}
                  onChange={(value) =>
                    setScheduleForm((s) => ({
                      ...s,
                      pdpListingStatus: value as 'active' | 'paused',
                    }))
                  }
                  options={[
                    { value: 'active', label: t('admin.listingsTab.active') },
                    { value: 'paused', label: t('admin.listingsTab.paused') },
                  ]}
                  renderMenuInPortal
                  className="w-full"
                />
              </div>
              <div>
                <span className={modalFieldLabelClassName}>
                  {t('admin.parsing.fieldLimitOptional')}
                </span>
                <input
                  type="number"
                  min={1}
                  className={modalInputClassName}
                  value={scheduleForm.pdpLimit}
                  onChange={(e) => setScheduleForm((s) => ({ ...s, pdpLimit: e.target.value }))}
                />
              </div>
              <div>
                <span className={modalFieldLabelClassName}>
                  {t('admin.parsing.fieldRegistrationType')}
                </span>
                <Dropdown
                  value={scheduleForm.pdpRegistrationType}
                  onChange={(value) =>
                    setScheduleForm((s) => ({ ...s, pdpRegistrationType: value }))
                  }
                  options={registrationTypeOptions}
                  renderMenuInPortal
                  className="w-full"
                />
              </div>
              <div>
                <span className={modalFieldLabelClassName}>
                  {t('admin.parsing.fieldDefaultHp')}
                </span>
                <input
                  type="number"
                  min={1}
                  className={modalInputClassName}
                  value={scheduleForm.pdpDefaultHp}
                  onChange={(e) =>
                    setScheduleForm((s) => ({ ...s, pdpDefaultHp: Number(e.target.value) }))
                  }
                />
              </div>
              <div>
                <span className={modalFieldLabelClassName}>{t('admin.parsing.fieldCity')}</span>
                <Dropdown
                  value={scheduleForm.pdpCity}
                  onChange={(value) => setScheduleForm((s) => ({ ...s, pdpCity: value }))}
                  options={cityOptions}
                  renderMenuInPortal
                  className="w-full"
                />
              </div>
              <div>
                <span className={modalFieldLabelClassName}>{t('admin.parsing.fieldDelayMs')}</span>
                <input
                  type="number"
                  min={0}
                  className={modalInputClassName}
                  value={scheduleForm.pdpDelayMs}
                  onChange={(e) =>
                    setScheduleForm((s) => ({ ...s, pdpDelayMs: Number(e.target.value) }))
                  }
                />
              </div>
              <div className="space-y-3">
                <Checkbox
                  checked={scheduleForm.pdpRemoveClosed}
                  onChange={(checked) =>
                    setScheduleForm((s) => ({ ...s, pdpRemoveClosed: checked }))
                  }
                  label={renderCheckboxLabelWithHint(
                    'admin.parsing.fieldRemoveClosed',
                    'admin.parsing.fieldRemoveClosedHint',
                    'admin.parsing.fieldRemoveClosedHintButton',
                  )}
                  size="sm"
                />
                <Checkbox
                  checked={scheduleForm.pdpOnlyFailed}
                  onChange={(checked) => setScheduleForm((s) => ({ ...s, pdpOnlyFailed: checked }))}
                  label={renderCheckboxLabelWithHint(
                    'admin.parsing.fieldOnlyFailed',
                    'admin.parsing.fieldOnlyFailedHint',
                    'admin.parsing.fieldOnlyFailedHintButton',
                  )}
                  size="sm"
                />
                <Checkbox
                  checked={scheduleForm.pdpUpdateExisting}
                  onChange={(checked) =>
                    setScheduleForm((s) => ({ ...s, pdpUpdateExisting: checked }))
                  }
                  label={renderCheckboxLabelWithHint(
                    'admin.parsing.fieldUpdateExisting',
                    'admin.parsing.fieldUpdateExistingHint',
                    'admin.parsing.fieldUpdateExistingHintButton',
                  )}
                  size="sm"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <AdminActionButton
              variant="secondary"
              className="flex-1"
              disabled={scheduleCreating}
              onClick={closeScheduleModal}
            >
              {t('common.cancel')}
            </AdminActionButton>
            <AdminActionButton
              className="flex-1"
              disabled={scheduleSubmitDisabled}
              aria-busy={scheduleCreating}
              onClick={() => void submitSchedule()}
            >
              {editingSchedule
                ? t('admin.parsing.submitScheduleSave')
                : t('admin.parsing.submitSchedule')}
            </AdminActionButton>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(logsModalRun)}
        onClose={() => {
          setLogsModalRun(null);
          setLogsRunId(null);
          setLogsSearchQuery('');
        }}
        title={t('admin.parsing.logsTitle')}
        size="large"
      >
        {hasLogContent ? (
          renderTextContentModal(
            logLines.join('\n'),
            logsSearchQuery,
            setLogsSearchQuery,
            t('admin.parsing.logsTitle'),
          )
        ) : (
          <InfoBlock>{t('admin.parsing.logsEmpty')}</InfoBlock>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(reportModalRun)}
        onClose={() => {
          setReportModalRun(null);
          setReportSearchQuery('');
        }}
        title={t('admin.parsing.reportTitle')}
        size="large"
      >
        {renderTextContentModal(
          reportJson,
          reportSearchQuery,
          setReportSearchQuery,
          t('admin.parsing.reportTitle'),
        )}
      </Modal>

      <Modal
        isOpen={plpFileModalOpen}
        onClose={() => {
          setPlpFileModalOpen(false);
          setPlpFileData(null);
          setPlpFileLoading(false);
          setPlpFileSearchQuery('');
        }}
        title={t('admin.parsing.fileTitle')}
        size="large"
      >
        {plpFileLoading ? (
          <div className="py-8 text-center text-text-secondary">{t('admin.parsing.loading')}</div>
        ) : plpFileData?.content ? (
          renderTextContentModal(
            plpFileData.content,
            plpFileSearchQuery,
            setPlpFileSearchQuery,
            t('admin.parsing.fileTitle'),
          )
        ) : (
          <InfoBlock>{t('admin.parsing.fileEmpty')}</InfoBlock>
        )}
      </Modal>

      <AdminConfirmModal
        isOpen={Boolean(cancelRun)}
        onClose={() => setCancelRun(null)}
        onConfirm={() => void confirmCancel()}
        title={t('admin.parsing.cancelTitle')}
        message={t('admin.parsing.cancelBody')}
        cancelLabel={t('common.cancel')}
        confirmLabel={t('admin.parsing.cancelConfirm')}
      />

      <AdminConfirmModal
        isOpen={Boolean(deletePlpFileTarget)}
        onClose={() => setDeletePlpFileTarget(null)}
        onConfirm={() => void confirmDeletePlpFile()}
        title={t('admin.parsing.plpFileDeleteTitle')}
        message={t('admin.parsing.plpFileDeleteBody', {
          fileName: deletePlpFileTarget?.fileName ?? '',
        })}
        cancelLabel={t('common.cancel')}
        confirmLabel={t('admin.parsing.plpFileDeleteConfirm')}
      />

      <AdminConfirmModal
        isOpen={Boolean(deleteSchedule)}
        onClose={() => setDeleteSchedule(null)}
        onConfirm={() => void confirmDeleteSchedule()}
        title={t('admin.parsing.deleteScheduleTitle')}
        message={t('admin.parsing.deleteScheduleBody')}
        cancelLabel={t('common.cancel')}
        confirmLabel={t('common.delete')}
      />
      <AdminActionsMenuPortal
        isOpen={Boolean(openPlpFileActionsMenu)}
        top={openPlpFileActionsMenu?.top ?? 0}
        left={openPlpFileActionsMenu?.left ?? 0}
        menuDataAttr="data-plp-file-actions-menu"
        items={
          openPlpFileActionsMenu
            ? [
                {
                  id: 'show',
                  label: t('admin.parsing.plpFileShow'),
                  onSelect: () => {
                    const selectedFile = openPlpFileActionsMenu.file;
                    setOpenPlpFileActionsMenu(null);
                    void openPlpFileFromTable(selectedFile);
                  },
                },
                {
                  id: 'download',
                  label: t('admin.parsing.plpFileDownload'),
                  onSelect: () => {
                    const selectedFile = openPlpFileActionsMenu.file;
                    setOpenPlpFileActionsMenu(null);
                    void downloadPlpFile(selectedFile);
                  },
                },
                {
                  id: 'delete',
                  label: t('admin.parsing.plpFileDelete'),
                  danger: true,
                  withTopDivider: true,
                  onSelect: () => {
                    const selectedFile = openPlpFileActionsMenu.file;
                    setOpenPlpFileActionsMenu(null);
                    setDeletePlpFileTarget(selectedFile);
                  },
                },
              ]
            : []
        }
      />
      <AdminActionsMenuPortal
        isOpen={Boolean(openScheduleActionsMenu && scheduleActionsTarget)}
        top={openScheduleActionsMenu?.top ?? 0}
        left={openScheduleActionsMenu?.left ?? 0}
        menuDataAttr="data-schedule-actions-menu"
        items={
          scheduleActionsTarget
            ? [
                {
                  id: 'run-now',
                  label: t('admin.parsing.runNow'),
                  onSelect: () => {
                    setOpenScheduleActionsMenu(null);
                    void runScheduleNow(scheduleActionsTarget);
                  },
                },
                {
                  id: 'edit',
                  label: t('common.edit'),
                  onSelect: () => {
                    setOpenScheduleActionsMenu(null);
                    openScheduleEditModal(scheduleActionsTarget);
                  },
                },
                {
                  id: 'toggle-status',
                  label:
                    scheduleActionsTarget.status === 'active'
                      ? t('admin.parsing.deactivate')
                      : t('admin.parsing.activate'),
                  onSelect: () => {
                    setOpenScheduleActionsMenu(null);
                    void toggleScheduleStatus(scheduleActionsTarget);
                  },
                },
                {
                  id: 'delete',
                  label: t('common.delete'),
                  danger: true,
                  withTopDivider: true,
                  onSelect: () => {
                    setOpenScheduleActionsMenu(null);
                    setDeleteSchedule(scheduleActionsTarget);
                  },
                },
              ]
            : []
        }
      />
      <AdminActionsMenuPortal
        isOpen={Boolean(openRunActionsMenu)}
        top={openRunActionsMenu?.top ?? 0}
        left={openRunActionsMenu?.left ?? 0}
        menuDataAttr="data-run-actions-menu"
        items={
          openRunActionsMenu
            ? [
                ...(openRunActionsMenu.canOpenFile
                  ? [
                      {
                        id: 'file',
                        label: t('admin.parsing.file'),
                        onSelect: () => {
                          const selectedRun = openRunActionsMenu.run;
                          setOpenRunActionsMenu(null);
                          void openCurrentPlpFile(selectedRun);
                        },
                      },
                    ]
                  : []),
                {
                  id: 'logs',
                  label: t('admin.parsing.logs'),
                  onSelect: () => {
                    const selectedRun = openRunActionsMenu.run;
                    setOpenRunActionsMenu(null);
                    openLogs(selectedRun);
                  },
                },
                ...(openRunActionsMenu.run.run_type === 'pdp'
                  ? [
                      {
                        id: 'report',
                        label: t('admin.parsing.report'),
                        onSelect: () => {
                          const selectedRun = openRunActionsMenu.run;
                          setOpenRunActionsMenu(null);
                          void openReport(selectedRun);
                        },
                      },
                    ]
                  : []),
                ...(isRunActive(openRunActionsMenu.run.status)
                  ? [
                      {
                        id: 'cancel',
                        label: t('admin.parsing.cancel'),
                        danger: true,
                        withTopDivider: true,
                        onSelect: () => {
                          const selectedRun = openRunActionsMenu.run;
                          setOpenRunActionsMenu(null);
                          setCancelRun(selectedRun);
                        },
                      },
                    ]
                  : []),
              ]
            : []
        }
      />
    </div>
  );
}
/* eslint-enable max-lines-per-function, max-lines, complexity */
