import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ParserLogChunk } from '../infrastructure/persistence/parser-log-chunk.entity';

export const PARSER_LOG_RETENTION_DAYS = 30;
const PARSER_LOG_DELETE_BATCH_SIZE = 5000;
const ACTIVE_PARSER_RUN_STATUSES = ['queued', 'in_progress', 'cancel_requested'] as const;

@Injectable()
export class ParserRunRetentionService {
  constructor(
    @InjectRepository(ParserLogChunk)
    private readonly logChunkRepo: Repository<ParserLogChunk>,
  ) {}

  async cleanupExpiredLogChunks(): Promise<{ deleted: number }> {
    let deleted = 0;
    for (;;) {
      const rows = (await this.logChunkRepo.query(
        `
        SELECT c.id
        FROM parser_log_chunks c
        INNER JOIN parser_runs r ON r.id = c.run_id
        WHERE r.status NOT IN ('queued', 'in_progress', 'cancel_requested')
          AND COALESCE(r.finished_at, r.updated_at) < now() - ($1 * interval '1 day')
        LIMIT $2
        `,
        [PARSER_LOG_RETENTION_DAYS, PARSER_LOG_DELETE_BATCH_SIZE],
      )) as Array<{ id: string }>;
      if (rows.length === 0) {
        break;
      }
      const result = await this.logChunkRepo.delete(rows.map((row) => row.id));
      deleted += result.affected ?? 0;
      if (rows.length < PARSER_LOG_DELETE_BATCH_SIZE) {
        break;
      }
    }
    return { deleted };
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleCleanup(): Promise<void> {
    const Sentry = await import('@sentry/node');
    return Sentry.withMonitor(
      'parser-log-retention',
      async () => {
        await this.cleanupExpiredLogChunks();
      },
      {
        schedule: {
          type: 'crontab',
          value: '0 3 * * *',
        },
        checkinMargin: 5,
        maxRuntime: 30,
      },
    );
  }
}

export function isParserRunLogRetentionExpired(
  run: {
    status: string;
    finished_at: Date | string | null;
    updated_at: Date | string;
  },
  chunkCount: number,
  now = Date.now(),
): boolean {
  if (chunkCount > 0) {
    return false;
  }
  if ((ACTIVE_PARSER_RUN_STATUSES as readonly string[]).includes(run.status)) {
    return false;
  }
  const reference = run.finished_at ?? run.updated_at;
  const referenceMs = new Date(reference).getTime();
  if (!Number.isFinite(referenceMs)) {
    return false;
  }
  const cutoffMs = now - PARSER_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  return referenceMs < cutoffMs;
}
