'use client';

import { useCallback, useRef, useState } from 'react';

import { useTranslation } from '@/hooks/useTranslation';
import { adminApi } from '@/lib/api';
import type { ParserRun, ParserRunCurrentPlpFile } from '@/lib/api/admin-parsing';
import { toast } from '@/lib/toast';

import { useParserRunLogPoller } from './useParserRunLogPoller';

export function useParsingTabRunModals() {
  const { t } = useTranslation();

  const [logsModalRun, setLogsModalRun] = useState<ParserRun | null>(null);
  const [logsRunId, setLogsRunId] = useState<string | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);
  const logSeqRef = useRef(0);

  const [reportModalRun, setReportModalRun] = useState<ParserRun | null>(null);
  const [reportJson, setReportJson] = useState('');
  const [plpFileModalOpen, setPlpFileModalOpen] = useState(false);
  const [plpFileData, setPlpFileData] = useState<ParserRunCurrentPlpFile | null>(null);
  const [plpFileLoading, setPlpFileLoading] = useState(false);
  const [logsSearchQuery, setLogsSearchQuery] = useState('');
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [plpFileSearchQuery, setPlpFileSearchQuery] = useState('');

  const hasLogContent = logLines.some((line) => typeof line === 'string' && line.trim().length > 0);

  const openLogs = useCallback((run: ParserRun) => {
    setLogsModalRun(run);
    setLogsRunId(run.id);
    setLogLines([]);
    setLogsSearchQuery('');
    logSeqRef.current = 0;
  }, []);

  const closeLogsModal = useCallback(() => {
    setLogsModalRun(null);
    setLogsRunId(null);
    setLogsSearchQuery('');
  }, []);

  useParserRunLogPoller({
    runId: logsRunId,
    logSeqRef,
    onLogChunks: (messages) => {
      setLogLines((prev) => [...prev, ...messages]);
    },
    onRunUpdate: setLogsModalRun,
    logsLoadErrorKey: t('admin.parsing.logsLoadError'),
  });

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

  const closeReportModal = useCallback(() => {
    setReportModalRun(null);
    setReportSearchQuery('');
  }, []);

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
    async (file: { parserCode: string; fileKey: string }) => {
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

  const closePlpFileModal = useCallback(() => {
    setPlpFileModalOpen(false);
    setPlpFileData(null);
    setPlpFileLoading(false);
    setPlpFileSearchQuery('');
  }, []);

  return {
    logsModalRun,
    logLines,
    hasLogContent,
    logsSearchQuery,
    setLogsSearchQuery,
    openLogs,
    closeLogsModal,
    reportModalRun,
    reportJson,
    reportSearchQuery,
    setReportSearchQuery,
    openReport,
    closeReportModal,
    plpFileModalOpen,
    plpFileData,
    plpFileLoading,
    plpFileSearchQuery,
    setPlpFileSearchQuery,
    openCurrentPlpFile,
    openPlpFileFromTable,
    closePlpFileModal,
  };
}
