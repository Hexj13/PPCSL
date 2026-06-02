import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ParserRun } from '../infrastructure/persistence/parser-run.entity';
import { ParserSchedule } from '../infrastructure/persistence/parser-schedule.entity';

import { ParserRunLogWriter } from './parser-run-log-writer.service';
import { ParsingRunChildProcessHost } from './parsing-run-child-process.host';
import { stringifyError } from './stringify-error.util';

@Injectable()
export class ParsingRunLifecycleService {
  private readonly logger = new Logger(ParsingRunLifecycleService.name);

  constructor(
    @InjectRepository(ParserRun)
    private readonly runRepo: Repository<ParserRun>,
    @InjectRepository(ParserSchedule)
    private readonly scheduleRepo: Repository<ParserSchedule>,
    private readonly runLogWriter: ParserRunLogWriter,
    private readonly childHost: ParsingRunChildProcessHost,
  ) {}

  async getRun(id: string): Promise<ParserRun> {
    const run = await this.runRepo.findOne({ where: { id } });
    if (!run) {
      throw new NotFoundException('errors.parserRunNotFound');
    }
    return run;
  }

  async claimQueuedRunForExecution(runId: string): Promise<boolean> {
    const startedAt = new Date();
    const result = await this.runRepo
      .createQueryBuilder()
      .update(ParserRun)
      .set({ status: 'in_progress', started_at: startedAt })
      .where('id = :id', { id: runId })
      .andWhere('status = :queued', { queued: 'queued' })
      .execute();
    return Boolean(result.affected && result.affected > 0);
  }

  async bumpScheduleAfterRun(
    scheduleId: string | null,
    lastRunStartedAt: Date | null,
  ): Promise<void> {
    if (!scheduleId) {
      return;
    }
    const sch = await this.scheduleRepo.findOne({ where: { id: scheduleId } });
    if (!sch || sch.deleted_at) {
      return;
    }
    sch.last_run_at = lastRunStartedAt ?? new Date();
    await this.scheduleRepo.save(sch);
  }

  async failRun(runId: string, error: unknown): Promise<void> {
    const message = stringifyError(error);
    this.childHost.failCleanup(runId);
    try {
      await this.runLogWriter.append(runId, 'error', message, message);
      await this.runLogWriter.flush(runId);
    } catch (logError) {
      this.logger.error(
        `[RUN][${runId}][error-log-failed] ${stringifyError(logError)} original=${message}`,
      );
    }
    const run = await this.runRepo.findOne({ where: { id: runId } });
    if (!run) {
      this.runLogWriter.cleanup(runId);
      this.logger.error(`[RUN][failed] runId=${runId} error=${message}`);
      return;
    }
    run.status = 'failed';
    run.finished_at = new Date();
    run.process_pid = null;
    run.error_summary = message;
    run.counters = { ...(run.counters ?? {}), exitCode: 1 };
    await this.runRepo.save(run);
    this.runLogWriter.cleanup(runId);
    this.logger.error(`[RUN][failed] runId=${runId} error=${message}`);
    await this.bumpScheduleAfterRun(run.schedule_id, run.started_at ?? run.created_at);
  }
}
