'use client';

import { useEffect, useRef, type MutableRefObject } from 'react';

import { adminApi } from '@/lib/api';
import type { ParserRun } from '@/lib/api/admin-parsing';
import { toast } from '@/lib/toast';

import { isRunActive } from './parsing-tab-utils';

type UseParserRunLogPollerOptions = {
  runId: string | null;
  logSeqRef: MutableRefObject<number>;
  onLogChunks: (_messages: string[]) => void;
  onRunUpdate: (_run: ParserRun) => void;
  onTerminal?: (_run: ParserRun) => void;
  isRunTerminal?: (_run: ParserRun) => boolean;
  logsLoadErrorKey: string;
  pollIntervalMs?: number;
};

export function useParserRunLogPoller({
  runId,
  logSeqRef,
  onLogChunks,
  onRunUpdate,
  onTerminal,
  isRunTerminal,
  logsLoadErrorKey,
  pollIntervalMs = 5000,
}: UseParserRunLogPollerOptions) {
  const lastErrorToastAtRef = useRef(0);

  useEffect(() => {
    if (!runId) return;
    let interval: ReturnType<typeof setInterval> | null = null;
    let stopped = false;

    const notifyLoadError = () => {
      const now = Date.now();
      if (now - lastErrorToastAtRef.current < 30_000) {
        return;
      }
      lastErrorToastAtRef.current = now;
      toast.error(logsLoadErrorKey);
    };

    const tick = async () => {
      if (stopped) return;
      try {
        const res = await adminApi.pollRunLogs(runId, logSeqRef.current, { quiet: true });
        const { run, lines, lastSeq } = res.data;
        if (lines.length > 0) {
          logSeqRef.current = lastSeq;
          onLogChunks(lines);
        }
        onRunUpdate(run);
        const terminal = isRunTerminal ? isRunTerminal(run) : !isRunActive(run.status);
        if (terminal) {
          stopped = true;
          if (interval) {
            clearInterval(interval);
            interval = null;
          }
          onTerminal?.(run);
        }
      } catch {
        notifyLoadError();
      }
    };

    void tick();
    interval = setInterval(() => void tick(), pollIntervalMs);
    return () => {
      stopped = true;
      if (interval) clearInterval(interval);
    };
  }, [
    logSeqRef,
    logsLoadErrorKey,
    onLogChunks,
    onRunUpdate,
    onTerminal,
    pollIntervalMs,
    runId,
    isRunTerminal,
  ]);
}
