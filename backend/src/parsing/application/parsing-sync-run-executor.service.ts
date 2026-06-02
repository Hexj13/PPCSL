import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CliParserRunnerService } from '../infrastructure/cli-parser-runner.service';
import { ParserRun } from '../infrastructure/persistence/parser-run.entity';

import { ParserPlpFileService } from './parser-plp-file.service';
import { ParserRunLogWriter } from './parser-run-log-writer.service';
import { buildParsingChildProcessEnv } from './parsing-env';
import { ParsingRunBucket } from './parsing-run-bucket';
import { ParsingRunChildProcessHost } from './parsing-run-child-process.host';
import { ParsingRunLifecycleService } from './parsing-run-lifecycle.service';
import { stringifyError } from './stringify-error.util';

@Injectable()
export class ParsingSyncRunExecutor {
  private readonly logger = new Logger(ParsingSyncRunExecutor.name);

  constructor(
    @InjectRepository(ParserRun)
    private readonly runRepo: Repository<ParserRun>,
    private readonly lifecycle: ParsingRunLifecycleService,
    private readonly childHost: ParsingRunChildProcessHost,
    private readonly cliRunner: CliParserRunnerService,
    private readonly runLogWriter: ParserRunLogWriter,
    private readonly plpFileService: ParserPlpFileService,
  ) {}

  async run(runId: string): Promise<ParsingRunBucket | null> {
    let capturedReportPath: string | null = null;
    let processErrorMessage: string | null = null;
    const run = await this.lifecycle.getRun(runId);
    const bucket: ParsingRunBucket = {
      parserCode: run.parser_code,
      runType: run.run_type,
      targetEnv: run.target_env,
      tracked: true,
    };
    if (run.status === 'cancelled') {
      return bucket;
    }
    if (run.status === 'cancel_requested') {
      run.status = 'cancelled';
      run.finished_at = new Date();
      await this.runRepo.save(run);
      return bucket;
    }
    const claimed = await this.lifecycle.claimQueuedRunForExecution(runId);
    if (!claimed) {
      this.logger.warn(`[SYNC][skip-claim] runId=${runId} parser=${run.parser_code}`);
      return bucket;
    }
    const claimedRun = await this.lifecycle.getRun(runId);
    if (
      claimedRun.parser_code !== 'cipauto' &&
      claimedRun.parser_code !== '999md' &&
      claimedRun.parser_code !== 'autooutlet'
    ) {
      throw new Error(`Unsupported parser for registry sync: ${claimedRun.parser_code}`);
    }
    const cfg = claimedRun.config_snapshot;
    const targetEnv = claimedRun.target_env;
    const extraEnv = buildParsingChildProcessEnv(targetEnv);
    const userId = claimedRun.assigned_user_id;
    if (!userId) {
      throw new Error('Registry sync requires assigned_user_id');
    }
    const login =
      typeof cfg.login === 'string' && cfg.login.trim().length > 0 ? cfg.login.trim() : undefined;
    if (claimedRun.parser_code === '999md' && !login) {
      throw new Error('999.md registry sync requires login in PLP snapshot');
    }
    this.logger.log(
      `[SYNC][start] runId=${runId} parser=${claimedRun.parser_code} assignedUserId=${userId} targetEnv=${targetEnv}`,
    );
    const handle = this.cliRunner.runSeedRegistry({
      parserCode: claimedRun.parser_code,
      env: targetEnv,
      userId,
      login,
      extraEnv,
      onStdoutLine: (line) => {
        void this.runLogWriter.append(runId, 'info', line, line);
        const m = line.match(/reportJson=(.+)$/);
        if (m) {
          capturedReportPath = m[1].trim();
        }
      },
      onStderrLine: (line) => {
        void this.runLogWriter.append(runId, 'error', line, line);
      },
      onProcessError: (error) => {
        processErrorMessage = stringifyError(error);
        void this.runLogWriter.append(runId, 'error', processErrorMessage, processErrorMessage);
      },
    });
    this.childHost.register(runId, handle.child);
    await this.runRepo.update(runId, { process_pid: handle.pid });
    const exitCode = await this.childHost.waitForChild(handle.child);
    this.childHost.unregister(runId);
    await this.runLogWriter.flush(runId);
    this.runLogWriter.cleanup(runId);
    const latest = await this.lifecycle.getRun(runId);
    const resolvedReportPath = await this.plpFileService.resolvePdpReportPath(
      claimedRun,
      capturedReportPath,
    );
    const resolvedCounters = await this.plpFileService.resolvePdpCounters(
      resolvedReportPath,
      exitCode,
    );
    if (latest.status === 'cancel_requested') {
      latest.status = 'cancelled';
      latest.finished_at = new Date();
      latest.process_pid = null;
      latest.report_storage_key = resolvedReportPath;
      latest.counters = resolvedCounters;
      await this.runRepo.save(latest);
      this.logger.warn(
        `[SYNC][cancelled] runId=${runId} parser=${latest.parser_code} exitCode=${exitCode}`,
      );
      await this.lifecycle.bumpScheduleAfterRun(latest.schedule_id, latest.started_at);
      return bucket;
    }
    latest.status = exitCode === 0 ? 'completed' : 'failed';
    latest.finished_at = new Date();
    latest.process_pid = null;
    latest.report_storage_key = resolvedReportPath;
    latest.counters = resolvedCounters;
    if (exitCode !== 0) {
      latest.error_summary = processErrorMessage ?? `CLI exited with code ${exitCode}`;
    }
    await this.runRepo.save(latest);
    this.logger.log(
      `[SYNC][finish] runId=${runId} parser=${latest.parser_code} status=${latest.status} exitCode=${exitCode} reportPath=${latest.report_storage_key ?? '-'}`,
    );
    await this.lifecycle.bumpScheduleAfterRun(latest.schedule_id, latest.started_at);
    return bucket;
  }
}
