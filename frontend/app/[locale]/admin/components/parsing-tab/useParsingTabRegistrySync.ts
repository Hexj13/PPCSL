'use client';

import { useCallback, useRef, useState } from 'react';

import { useAssignUserValidation } from '@/components/ListingForm/useAssignUserValidation';
import { useTranslation } from '@/hooks/useTranslation';
import { adminApi } from '@/lib/api';
import type { ParserRun, PlpFileInfo } from '@/lib/api/admin-parsing';
import { toast } from '@/lib/toast';

import { isRunActive } from './parsing-tab-utils';
import { useParserRunLogView } from './useParserRunLogView';

export function useParsingTabRegistrySync() {
  const { t } = useTranslation();

  const [registrySyncModalOpen, setRegistrySyncModalOpen] = useState(false);
  const registrySyncModalOpenRef = useRef(false);
  const [registrySyncFile, setRegistrySyncFile] = useState<PlpFileInfo | null>(null);
  const [registrySyncHintLoading, setRegistrySyncHintLoading] = useState(false);
  const [registrySyncHint, setRegistrySyncHint] = useState<{
    login: string | null;
    suggestedAssignedUserId: string | null;
    plpLoginMatchesFileKey: boolean;
  } | null>(null);
  const [registrySyncAssignedUserId, setRegistrySyncAssignedUserId] = useState('');
  const registrySyncRunIdsRef = useRef<Record<string, string>>({});
  const registrySyncReportFetchedRef = useRef(false);
  const [registrySyncModalRun, setRegistrySyncModalRun] = useState<ParserRun | null>(null);
  const [registrySyncSearchQuery, setRegistrySyncSearchQuery] = useState('');
  const [registrySyncReportJson, setRegistrySyncReportJson] = useState('');

  const registrySyncAssignValidation = useAssignUserValidation(registrySyncAssignedUserId);

  const {
    logLines: registrySyncLogLines,
    hasLogContent: hasRegistrySyncLogContent,
    resetLogView,
    loadRunLogs,
    startPollingRunLogs,
  } = useParserRunLogView({
    sessionOpenRef: registrySyncModalOpenRef,
    logsLoadErrorKey: t('admin.parsing.logsLoadError'),
    onRunUpdate: setRegistrySyncModalRun,
    onTerminal: (run) => {
      if (
        run.status === 'completed' &&
        !registrySyncReportFetchedRef.current &&
        registrySyncModalOpenRef.current
      ) {
        registrySyncReportFetchedRef.current = true;
        void (async () => {
          try {
            const reportRes = await adminApi.getRunReport(run.id);
            if (!registrySyncModalOpenRef.current) {
              return;
            }
            setRegistrySyncReportJson(JSON.stringify(reportRes.data, null, 2));
          } catch {
            if (registrySyncModalOpenRef.current) {
              setRegistrySyncReportJson('');
            }
          }
        })();
      }
    },
  });

  const plpRegistrySyncFileKey = useCallback(
    (file: PlpFileInfo) => `${file.parserCode}:${file.fileKey}`,
    [],
  );

  const loadRegistrySyncReport = useCallback(async (runId: string) => {
    registrySyncReportFetchedRef.current = true;
    try {
      const reportRes = await adminApi.getRunReport(runId);
      if (!registrySyncModalOpenRef.current) {
        return;
      }
      setRegistrySyncReportJson(JSON.stringify(reportRes.data, null, 2));
    } catch {
      if (registrySyncModalOpenRef.current) {
        setRegistrySyncReportJson('');
      }
    }
  }, []);

  const openRegistrySyncModal = useCallback(
    async (file: PlpFileInfo) => {
      registrySyncModalOpenRef.current = true;
      setRegistrySyncFile(file);
      setRegistrySyncModalOpen(true);
      setRegistrySyncHint(null);
      setRegistrySyncHintLoading(true);
      setRegistrySyncSearchQuery('');
      setRegistrySyncReportJson('');
      resetLogView();
      registrySyncReportFetchedRef.current = false;
      try {
        const res = await adminApi.getRegistrySyncHint(file.parserCode, file.fileKey);
        if (!registrySyncModalOpenRef.current) {
          return;
        }
        setRegistrySyncHint(res.data);
        setRegistrySyncAssignedUserId(res.data.suggestedAssignedUserId ?? '');
        const k = plpRegistrySyncFileKey(file);
        const persistedId = registrySyncRunIdsRef.current[k];
        if (persistedId) {
          const runRes = await adminApi.getRun(persistedId);
          if (!registrySyncModalOpenRef.current) {
            return;
          }
          setRegistrySyncModalRun(runRes.data);
          if (isRunActive(runRes.data.status)) {
            startPollingRunLogs(persistedId);
            return;
          }
          await loadRunLogs(runRes.data);
          if (!registrySyncModalOpenRef.current) {
            return;
          }
          if (runRes.data.status === 'completed') {
            await loadRegistrySyncReport(persistedId);
          } else {
            setRegistrySyncReportJson('');
          }
          return;
        }
        setRegistrySyncModalRun(null);
      } catch {
        if (registrySyncModalOpenRef.current) {
          toast.error(t('admin.parsing.registrySyncHintLoadError'));
        }
        setRegistrySyncAssignedUserId('');
        setRegistrySyncModalRun(null);
        resetLogView();
      } finally {
        if (registrySyncModalOpenRef.current) {
          setRegistrySyncHintLoading(false);
        }
      }
    },
    [
      loadRegistrySyncReport,
      loadRunLogs,
      plpRegistrySyncFileKey,
      resetLogView,
      startPollingRunLogs,
      t,
    ],
  );

  const closeRegistrySyncModal = useCallback(() => {
    registrySyncModalOpenRef.current = false;
    resetLogView();
    setRegistrySyncModalOpen(false);
  }, [resetLogView]);

  const startRegistrySync = useCallback(async () => {
    if (!registrySyncFile) return;
    if (registrySyncAssignValidation.status !== 'valid') {
      toast.error(t('admin.parsing.assignUserRequired'));
      return;
    }
    const uid = registrySyncAssignedUserId.trim();
    try {
      const run = await adminApi.createRegistrySyncRun(
        registrySyncFile.parserCode,
        registrySyncFile.fileKey,
        {
          assignedUserId: uid || undefined,
        },
      );
      const k = plpRegistrySyncFileKey(registrySyncFile);
      registrySyncRunIdsRef.current[k] = run.data.id;
      setRegistrySyncModalRun(run.data);
      setRegistrySyncReportJson('');
      registrySyncReportFetchedRef.current = false;
      startPollingRunLogs(run.data.id);
      toast.success(t('admin.parsing.runStarted'));
    } catch {
      toast.error(t('admin.parsing.registrySyncRunStartError'));
    }
  }, [
    plpRegistrySyncFileKey,
    startPollingRunLogs,
    registrySyncAssignValidation.status,
    registrySyncAssignedUserId,
    registrySyncFile,
    t,
  ]);

  const cancelRegistrySyncRun = useCallback(async () => {
    if (!registrySyncModalRun) return;
    if (!isRunActive(registrySyncModalRun.status)) {
      return;
    }
    try {
      await adminApi.cancelRun(registrySyncModalRun.id);
      toast.success(t('admin.parsing.cancelRequested'));
      const refreshed = await adminApi.getRun(registrySyncModalRun.id);
      setRegistrySyncModalRun(refreshed.data);
    } catch {
      toast.error(t('admin.parsing.cancelError'));
    }
  }, [registrySyncModalRun, t]);

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

  return {
    registrySyncModalOpen,
    registrySyncFile,
    registrySyncHintLoading,
    registrySyncHint,
    registrySyncAssignedUserId,
    setRegistrySyncAssignedUserId,
    registrySyncLogLines,
    registrySyncModalRun,
    registrySyncSearchQuery,
    setRegistrySyncSearchQuery,
    registrySyncReportJson,
    registrySyncAssignValidation,
    hasRegistrySyncLogContent,
    openRegistrySyncModal,
    closeRegistrySyncModal,
    startRegistrySync,
    cancelRegistrySyncRun,
    downloadPlpFile,
    setRegistrySyncModalRun,
  };
}
