'use client';

import { useCallback, useRef, useState } from 'react';

import { useAssignUserValidation } from '@/components/ListingForm/useAssignUserValidation';
import { useTranslation } from '@/hooks/useTranslation';
import { adminApi } from '@/lib/api';
import type { ParserRun, PlpFileInfo } from '@/lib/api/admin-parsing';
import { toast } from '@/lib/toast';

import { isRunActive } from './parsing-tab-utils';
import { useParserRunLogPoller } from './useParserRunLogPoller';

export function useParsingTabRegistrySync() {
  const { t } = useTranslation();

  const [registrySyncModalOpen, setRegistrySyncModalOpen] = useState(false);
  const [registrySyncFile, setRegistrySyncFile] = useState<PlpFileInfo | null>(null);
  const [registrySyncHintLoading, setRegistrySyncHintLoading] = useState(false);
  const [registrySyncHint, setRegistrySyncHint] = useState<{
    login: string | null;
    suggestedAssignedUserId: string | null;
    plpLoginMatchesFileKey: boolean;
  } | null>(null);
  const [registrySyncAssignedUserId, setRegistrySyncAssignedUserId] = useState('');
  const [registrySyncRunId, setRegistrySyncRunId] = useState<string | null>(null);
  const registrySyncRunIdsRef = useRef<Record<string, string>>({});
  const registrySyncLogSeqRef = useRef(0);
  const registrySyncReportFetchedRef = useRef(false);
  const [registrySyncLogLines, setRegistrySyncLogLines] = useState<string[]>([]);
  const [registrySyncModalRun, setRegistrySyncModalRun] = useState<ParserRun | null>(null);
  const [registrySyncSearchQuery, setRegistrySyncSearchQuery] = useState('');
  const [registrySyncReportJson, setRegistrySyncReportJson] = useState('');

  const registrySyncAssignValidation = useAssignUserValidation(registrySyncAssignedUserId);

  const hasRegistrySyncLogContent = registrySyncLogLines.some(
    (line) => typeof line === 'string' && line.trim().length > 0,
  );

  const plpRegistrySyncFileKey = useCallback(
    (file: PlpFileInfo) => `${file.parserCode}:${file.fileKey}`,
    [],
  );

  const openRegistrySyncModal = useCallback(
    async (file: PlpFileInfo) => {
      setRegistrySyncFile(file);
      setRegistrySyncModalOpen(true);
      setRegistrySyncHint(null);
      setRegistrySyncHintLoading(true);
      setRegistrySyncSearchQuery('');
      setRegistrySyncReportJson('');
      setRegistrySyncLogLines([]);
      registrySyncLogSeqRef.current = 0;
      registrySyncReportFetchedRef.current = false;
      try {
        const res = await adminApi.getRegistrySyncHint(file.parserCode, file.fileKey);
        setRegistrySyncHint(res.data);
        setRegistrySyncAssignedUserId(res.data.suggestedAssignedUserId ?? '');
        const k = plpRegistrySyncFileKey(file);
        const persistedId = registrySyncRunIdsRef.current[k];
        if (persistedId) {
          const runRes = await adminApi.getRun(persistedId);
          setRegistrySyncModalRun(runRes.data);
          const activeLike =
            isRunActive(runRes.data.status) ||
            runRes.data.status === 'cancel_requested' ||
            runRes.data.status === 'queued';
          if (activeLike) {
            setRegistrySyncRunId(persistedId);
            registrySyncLogSeqRef.current = 0;
            setRegistrySyncLogLines([]);
            registrySyncReportFetchedRef.current = false;
            return;
          }
          setRegistrySyncRunId(null);
          registrySyncReportFetchedRef.current = false;
          let afterSeq = 0;
          const lines: string[] = [];
          for (let pageIdx = 0; pageIdx < 50; pageIdx += 1) {
            const lr = await adminApi.getRunLogs(persistedId, afterSeq);
            const chunks = lr.data.data;
            if (chunks.length === 0) break;
            const maxSeq = Math.max(...chunks.map((c) => c.seq));
            afterSeq = maxSeq;
            lines.push(
              ...chunks.flatMap((chunk) =>
                typeof chunk.message === 'string' && chunk.message.trim().length > 0
                  ? [chunk.message]
                  : [],
              ),
            );
            if (chunks.length < 500) break;
          }
          registrySyncLogSeqRef.current = afterSeq;
          setRegistrySyncLogLines(lines);
          if (runRes.data.status === 'completed') {
            registrySyncReportFetchedRef.current = true;
            try {
              const reportRes = await adminApi.getRunReport(persistedId);
              setRegistrySyncReportJson(JSON.stringify(reportRes.data, null, 2));
            } catch {
              setRegistrySyncReportJson('');
            }
          } else {
            setRegistrySyncReportJson('');
          }
          return;
        }
        setRegistrySyncRunId(null);
        setRegistrySyncModalRun(null);
      } catch {
        toast.error(t('admin.parsing.registrySyncHintLoadError'));
        setRegistrySyncAssignedUserId('');
        setRegistrySyncRunId(null);
        setRegistrySyncModalRun(null);
      } finally {
        setRegistrySyncHintLoading(false);
      }
    },
    [plpRegistrySyncFileKey, t],
  );

  const closeRegistrySyncModal = useCallback(() => {
    setRegistrySyncModalOpen(false);
  }, []);

  useParserRunLogPoller({
    runId: registrySyncRunId,
    logSeqRef: registrySyncLogSeqRef,
    onLogChunks: (messages) => {
      setRegistrySyncLogLines((prev) => [...prev, ...messages]);
    },
    onRunUpdate: setRegistrySyncModalRun,
    isRunTerminal: (run) => !isRunActive(run.status) && run.status !== 'queued',
    onTerminal: (run) => {
      if (
        run.status === 'completed' &&
        !registrySyncReportFetchedRef.current &&
        run.id === registrySyncRunId
      ) {
        registrySyncReportFetchedRef.current = true;
        void (async () => {
          try {
            const reportRes = await adminApi.getRunReport(registrySyncRunId!);
            setRegistrySyncReportJson(JSON.stringify(reportRes.data, null, 2));
          } catch {
            setRegistrySyncReportJson('');
          }
        })();
      }
    },
    logsLoadErrorKey: t('admin.parsing.logsLoadError'),
  });

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
      setRegistrySyncRunId(run.data.id);
      setRegistrySyncModalRun(run.data);
      setRegistrySyncLogLines([]);
      registrySyncLogSeqRef.current = 0;
      setRegistrySyncReportJson('');
      registrySyncReportFetchedRef.current = false;
      toast.success(t('admin.parsing.runStarted'));
    } catch {
      toast.error(t('admin.parsing.registrySyncRunStartError'));
    }
  }, [
    plpRegistrySyncFileKey,
    registrySyncAssignValidation.status,
    registrySyncAssignedUserId,
    registrySyncFile,
    t,
  ]);

  const cancelRegistrySyncRun = useCallback(async () => {
    if (!registrySyncModalRun) return;
    if (!isRunActive(registrySyncModalRun.status) && registrySyncModalRun.status !== 'queued') {
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
    registrySyncRunId,
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
