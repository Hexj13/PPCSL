'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { usePaginatedData } from '@/hooks/usePaginatedData';
import { useRefreshWhenVisible } from '@/hooks/useRefreshWhenVisible';
import { useTranslation } from '@/hooks/useTranslation';
import { adminApi } from '@/lib/api';
import type { ParserRun, ParserSchedule, PlpFileInfo } from '@/lib/api/admin-parsing';
import { toast } from '@/lib/toast';

import type { InnerTab, ParsingListFilters } from './parsing-tab-types';

type UseParsingTabListsOptions = {
  isActive: boolean;
  innerTab: InnerTab;
  refreshCatalog: () => Promise<void>;
};

export function useParsingTabLists({
  isActive,
  innerTab,
  refreshCatalog,
}: UseParsingTabListsOptions) {
  const { t } = useTranslation();

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

  const onPlpFilesRefresh = useCallback(async () => {
    const ok = await plpFilesList.reloadAsync(true);
    if (ok === false) {
      toast.error(t('admin.parsing.plpFilesLoadError'));
    }
  }, [plpFilesList, t]);

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

  useRefreshWhenVisible(isActive, () => {
    void plpRuns.reloadAsync(true);
    void pdpRuns.reloadAsync(true);
    void schedules.reloadAsync(true);
    void plpFilesList.reloadAsync(true);
    void refreshCatalog();
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

  const scheduleActionsTarget = useMemo(() => {
    if (!openScheduleActionsMenu) {
      return null;
    }
    return schedules.data.find((schedule) => schedule.id === openScheduleActionsMenu.id) ?? null;
  }, [openScheduleActionsMenu, schedules.data]);

  return {
    plpRuns,
    pdpRuns,
    schedules,
    plpFilesList,
    onPlpRunsListRefresh,
    onPdpRunsListRefresh,
    onPlpFilesRefresh,
    plpListRefreshCooldown,
    pdpListRefreshCooldown,
    cancelRun,
    setCancelRun,
    deletePlpFileTarget,
    setDeletePlpFileTarget,
    deleteSchedule,
    setDeleteSchedule,
    openPlpFileActionsMenu,
    setOpenPlpFileActionsMenu,
    openRunActionsMenu,
    setOpenRunActionsMenu,
    openScheduleActionsMenu,
    setOpenScheduleActionsMenu,
    scheduleActionsTarget,
  };
}
