'use client';

import { useEffect, type MutableRefObject } from 'react';

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
  pollIntervalMs = 2500,
}: UseParserRunLogPollerOptions) {
  useEffect(() => {
    if (!runId) return;
    let interval: ReturnType<typeof setInterval> | null = null;
    const tick = async () => {
      try {
        const res = await adminApi.getRunLogs(runId, logSeqRef.current);
        const chunks = res.data.data;
        if (chunks.length > 0) {
          const maxSeq = Math.max(...chunks.map((c) => c.seq));
          logSeqRef.current = maxSeq;
          onLogChunks(
            chunks.flatMap((chunk) =>
              typeof chunk.message === 'string' && chunk.message.trim().length > 0
                ? [chunk.message]
                : [],
            ),
          );
        }
        const refreshed = await adminApi.getRun(runId);
        onRunUpdate(refreshed.data);
        const terminal = isRunTerminal
          ? isRunTerminal(refreshed.data)
          : !isRunActive(refreshed.data.status);
        if (terminal && interval) {
          clearInterval(interval);
          interval = null;
          onTerminal?.(refreshed.data);
        }
      } catch {
        toast.error(logsLoadErrorKey);
      }
    };
    void tick();
    interval = setInterval(() => void tick(), pollIntervalMs);
    return () => {
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
