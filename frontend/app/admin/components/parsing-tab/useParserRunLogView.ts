'use client';

import { useCallback, useRef, useState, type MutableRefObject } from 'react';

import type { ParserRun } from '@/lib/api/admin-parsing';
import { toast } from '@/lib/toast';

import { fetchParserRunLogLines } from './fetch-parser-run-log-lines';
import { isRunActive } from './parsing-tab-utils';
import { useParserRunLogPoller } from './useParserRunLogPoller';

export type UseParserRunLogViewOptions = {
  sessionOpenRef: MutableRefObject<boolean>;
  logsLoadErrorKey: string;
  onRunUpdate?: (run: ParserRun) => void;
  onTerminal?: (run: ParserRun) => void;
  isRunTerminal?: (run: ParserRun) => boolean;
};

export function useParserRunLogView({
  sessionOpenRef,
  logsLoadErrorKey,
  onRunUpdate,
  onTerminal,
  isRunTerminal,
}: UseParserRunLogViewOptions) {
  const [pollRunId, setPollRunId] = useState<string | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);
  const logSeqRef = useRef(0);

  const hasLogContent = logLines.some((line) => typeof line === 'string' && line.trim().length > 0);

  const resetLogView = useCallback(() => {
    setPollRunId(null);
    logSeqRef.current = 0;
    setLogLines([]);
  }, []);

  const loadRunLogs = useCallback(
    async (run: ParserRun) => {
      logSeqRef.current = 0;
      setLogLines([]);
      if (!isRunActive(run.status)) {
        setPollRunId(null);
        try {
          const { lines, lastSeq } = await fetchParserRunLogLines(run.id);
          if (!sessionOpenRef.current) {
            return;
          }
          logSeqRef.current = lastSeq;
          setLogLines(lines);
        } catch {
          if (sessionOpenRef.current) {
            toast.error(logsLoadErrorKey);
          }
        }
        return;
      }
      setPollRunId(run.id);
    },
    [logsLoadErrorKey, sessionOpenRef],
  );

  const startPollingRunLogs = useCallback((runId: string) => {
    logSeqRef.current = 0;
    setLogLines([]);
    setPollRunId(runId);
  }, []);

  useParserRunLogPoller({
    runId: pollRunId,
    logSeqRef,
    onLogChunks: (messages) => {
      if (!sessionOpenRef.current) {
        return;
      }
      setLogLines((prev) => [...prev, ...messages]);
    },
    onRunUpdate: (run) => {
      if (!sessionOpenRef.current) {
        return;
      }
      onRunUpdate?.(run);
    },
    onTerminal,
    isRunTerminal,
    logsLoadErrorKey,
  });

  return {
    logLines,
    setLogLines,
    logSeqRef,
    hasLogContent,
    resetLogView,
    loadRunLogs,
    startPollingRunLogs,
  };
}
