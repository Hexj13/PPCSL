'use client';

import { useCallback, useRef, useState } from 'react';

import { useTranslation } from '@/hooks/useTranslation';
import { adminApi } from '@/lib/api';
import type { ParserRun, ParserRunCurrentPlpFile } from '@/lib/api/admin-parsing';
import { toast } from '@/lib/toast';

import { useParserRunLogView } from './useParserRunLogView';

export function useParsingTabRunModals() {
  const { t } = useTranslation();

  const [logsModalRun, setLogsModalRun] = useState<ParserRun | null>(null);
  const logsModalOpenRef = useRef(false);
  const { logLines, hasLogContent, resetLogView, loadRunLogs } = useParserRunLogView({
    sessionOpenRef: logsModalOpenRef,
    logsLoadErrorKey: t('admin.parsing.logsLoadError'),
    onRunUpdate: setLogsModalRun,
  });

  const [reportModalRun, setReportModalRun] = useState<ParserRun | null>(null);
  const [reportJson, setReportJson] = useState('');
  const [plpFileModalOpen, setPlpFileModalOpen] = useState(false);
  const [plpFileData, setPlpFileData] = useState<ParserRunCurrentPlpFile | null>(null);
  const [plpFileLoading, setPlpFileLoading] = useState(false);
  const [logsSearchQuery, setLogsSearchQuery] = useState('');
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [plpFileSearchQuery, setPlpFileSearchQuery] = useState('');

  const openLogs = useCallback(
    async (run: ParserRun) => {
      logsModalOpenRef.current = true;
      setLogsModalRun(run);
      setLogsSearchQuery('');
      await loadRunLogs(run);
    },
    [loadRunLogs],
  );

  const closeLogsModal = useCallback(() => {
    logsModalOpenRef.current = false;
    resetLogView();
    setLogsModalRun(null);
    setLogsSearchQuery('');
  }, [resetLogView]);

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
