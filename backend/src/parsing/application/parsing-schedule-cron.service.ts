import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { QueryFailedError } from 'typeorm';

import { resolveParsingSchedulerEnabled } from './parsing-env';
import { ParsingOrchestratorService } from './parsing-orchestrator.service';
import { ParsingScheduleService } from './parsing-schedule.service';

@Injectable()
export class ParsingScheduleCronService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ParsingScheduleCronService.name);

  constructor(
    private readonly schedules: ParsingScheduleService,
    private readonly orchestrator: ParsingOrchestratorService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      const fixed = await this.orchestrator.reconcileStaleActiveRunsOnStartup();
      if (fixed > 0) {
        this.logger.warn(`[SCHEDULER][startup-reconcile] staleRuns=${fixed}`);
      }
    } catch (error) {
      if (this.isMissingParsingTablesError(error)) {
        this.logger.warn(
          '[SCHEDULER][startup-reconcile-skipped] Parsing tables are missing. Run migrations to enable parsing scheduler.',
        );
        return;
      }
      throw error;
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async runDueSchedules(): Promise<void> {
    if (!resolveParsingSchedulerEnabled()) {
      return;
    }
    const now = new Date();
    const claimed = await this.schedules.claimDueSchedules(now, 15);
    if (claimed.length > 0) {
      this.logger.log(
        `[SCHEDULER][cron] claimedSchedules=${claimed.length} at=${now.toISOString()}`,
      );
    }
    for (const item of claimed) {
      try {
        const run = await this.orchestrator.createRunFromSchedule(item.schedule, item.plannedRunAt);
        this.logger.log(
          `[SCHEDULER][cron-triggered] scheduleId=${item.schedule.id} parser=${item.schedule.parser_code} runType=${item.schedule.run_type} plannedRunAt=${item.plannedRunAt.toISOString()} runId=${run?.id ?? '-'}`,
        );
      } catch (error) {
        this.logger.warn(`Schedule ${item.schedule.id} trigger failed: ${String(error)}`);
      }
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async refreshAvailabilityBatch(): Promise<void> {
    if (!resolveParsingSchedulerEnabled()) {
      return;
    }
    const threshold = new Date(Date.now() - 10 * 60 * 1000);
    const rows = await this.schedules.findSchedulesNeedingAvailabilityRefresh(threshold, 25);
    if (rows.length > 0) {
      this.logger.log(
        `[SCHEDULER][availability-batch] schedules=${rows.length} threshold=${threshold.toISOString()}`,
      );
    }
    for (const row of rows) {
      try {
        await this.schedules.refreshScheduleAvailability(row.id);
      } catch (error) {
        this.logger.warn(`Availability refresh failed for ${row.id}: ${String(error)}`);
      }
    }
  }

  private isMissingParsingTablesError(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }
    const typedError = error as QueryFailedError & {
      code?: string;
      message?: string;
      driverError?: { code?: string; message?: string };
    };
    const code = typedError.code ?? typedError.driverError?.code;
    const message = (
      typedError.message ??
      typedError.driverError?.message ??
      ''
    ).toLowerCase();
    const referencesParsingTables =
      message.includes('parser_runs') ||
      message.includes('parser_schedules') ||
      message.includes('parser_log_chunks');
    return code === '42P01' && referencesParsingTables;
  }
}
