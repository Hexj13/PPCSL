'use client';

import { useCallback, useRef, useState } from 'react';

import { useAssignUserValidation } from '@/components/ListingForm/useAssignUserValidation';
import { useTabIndicator } from '@/hooks/useTabIndicator';
import { useTranslation } from '@/hooks/useTranslation';
import { adminApi } from '@/lib/api';
import type { ParserSchedule } from '@/lib/api/admin-parsing';
import { toast } from '@/lib/toast';

import type { InnerTab, ParsingTabProps } from './parsing-tab-types';
import { useParsingTabCatalog } from './useParsingTabCatalog';
import { useParsingTabFormState } from './useParsingTabFormState';
import { useParsingTabForms } from './useParsingTabForms';
import { useParsingTabLists } from './useParsingTabLists';
import { useParsingTabManualRuns } from './useParsingTabManualRuns';
import { useParsingTabRegistrySync } from './useParsingTabRegistrySync';
import { useParsingTabRunModals } from './useParsingTabRunModals';
import { useParsingTabSchedules } from './useParsingTabSchedules';

export function useParsingTabController({ isActive }: ParsingTabProps) {
  const { t } = useTranslation();
  const plpTabRef = useRef<HTMLButtonElement>(null);
  const pdpTabRef = useRef<HTMLButtonElement>(null);
  const schedulerTabRef = useRef<HTMLButtonElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [innerTab, setInnerTab] = useState<InnerTab>('plp');

  const formState = useParsingTabFormState();
  const pdpAssignValidation = useAssignUserValidation(formState.pdpForm.assignedUserId);
  const scheduleAssignValidation = useAssignUserValidation(formState.scheduleForm.assignedUserId);

  const catalog = useParsingTabCatalog({
    setPlpForm: formState.setPlpForm,
    setPdpForm: formState.setPdpForm,
    setScheduleForm: formState.setScheduleForm,
    isActive,
  });

  const runModals = useParsingTabRunModals();
  const registrySync = useParsingTabRegistrySync();
  const lists = useParsingTabLists({
    isActive,
    innerTab,
    refreshCatalog: catalog.refreshCatalog,
  });

  const schedules = useParsingTabSchedules({
    cities: catalog.cities,
    schedulerParserOptions: catalog.schedulerParserOptions,
    scheduleForm: formState.scheduleForm,
    setScheduleForm: formState.setScheduleForm,
    scheduleAssignValidation,
    defaultParserCode: catalog.defaultParserCode,
    catalogLoading: catalog.catalogLoading,
    catalog: catalog.catalog,
    schedulesReload: lists.schedules.reload,
    plpRunsReload: lists.plpRuns.reload,
    pdpRunsReload: lists.pdpRuns.reload,
  });

  const manualRuns = useParsingTabManualRuns({
    catalog: catalog.catalog,
    catalogLoading: catalog.catalogLoading,
    defaultParserCode: catalog.defaultParserCode,
    plpForm: formState.plpForm,
    pdpForm: formState.pdpForm,
    plpScanInputMode:
      catalog.catalog.find((item) => item.code === formState.plpForm.parserCode)?.scanInputMode ??
      'pages',
    pdpAssignValidation,
    plpRunsReload: lists.plpRuns.reload,
    pdpRunsReload: lists.pdpRuns.reload,
    onPlpModalClose: () => undefined,
    onPdpModalClose: () => undefined,
  });

  const forms = useParsingTabForms({
    ...formState,
    catalog: catalog.catalog,
    cities: catalog.cities,
    plpFilesByParser: catalog.plpFilesByParser,
    loadParserPlpFiles: catalog.loadParserPlpFiles,
    manualRunParserOptions: catalog.manualRunParserOptions,
    schedulerParserOptions: catalog.schedulerParserOptions,
    pdpModalOpen: manualRuns.pdpModalOpen,
    scheduleModalOpen: schedules.scheduleModalOpen,
    editingSchedule: schedules.editingSchedule,
    pdpAssignValidation,
    scheduleAssignValidation,
  });

  const { indicatorRef, indicatorStyle } = useTabIndicator(
    innerTab,
    {
      plp: plpTabRef,
      pdp: pdpTabRef,
      scheduler: schedulerTabRef,
    },
    tabsContainerRef,
  );

  const confirmCancel = useCallback(async () => {
    const cancelRun = lists.cancelRun;
    if (!cancelRun) return;
    try {
      await adminApi.cancelRun(cancelRun.id);
      toast.success(t('admin.parsing.cancelRequested'));
      lists.setCancelRun(null);
      lists.plpRuns.reload(true);
      lists.pdpRuns.reload(true);
      if (registrySync.registrySyncRunId === cancelRun.id) {
        const refreshed = await adminApi.getRun(cancelRun.id);
        registrySync.setRegistrySyncModalRun(refreshed.data);
      }
    } catch {
      toast.error(t('admin.parsing.cancelError'));
    }
  }, [lists, registrySync, t]);

  const confirmDeletePlpFile = useCallback(async () => {
    if (!lists.deletePlpFileTarget) {
      return;
    }
    try {
      await adminApi.deletePlpFile(
        lists.deletePlpFileTarget.parserCode,
        lists.deletePlpFileTarget.fileKey,
      );
      toast.success(t('admin.parsing.plpFileDeleted'));
      const parserCode = lists.deletePlpFileTarget.parserCode;
      lists.setDeletePlpFileTarget(null);
      await lists.plpFilesList.reloadAsync(false);
      await catalog.loadParserPlpFiles(parserCode);
    } catch {
      toast.error(t('admin.parsing.plpFileDeleteError'));
    }
  }, [catalog, lists, t]);

  const confirmDeleteSchedule = useCallback(
    async (target: ParserSchedule | null) => {
      await schedules.confirmDeleteSchedule(target, () => lists.setDeleteSchedule(null));
    },
    [lists, schedules],
  );

  const tabButtonClassName = (active: boolean) =>
    `shrink-0 px-4 py-3 text-base font-semibold transition-all duration-300 relative z-10 whitespace-nowrap flex items-center ${
      active
        ? 'text-primary-700 bg-primary-500/10 rounded-t-lg'
        : 'text-primary-700 hover-only:hover:text-primary-900 hover-only:hover:bg-primary-500/10'
    }`;

  return {
    t,
    innerTab,
    setInnerTab,
    plpTabRef,
    pdpTabRef,
    schedulerTabRef,
    tabsContainerRef,
    indicatorRef,
    indicatorStyle,
    tabButtonClassName,
    catalog,
    forms,
    formState,
    lists,
    runModals,
    registrySync,
    schedules,
    manualRuns,
    confirmCancel,
    confirmDeletePlpFile,
    confirmDeleteSchedule,
  };
}

export type ParsingTabControllerState = ReturnType<typeof useParsingTabController>;
