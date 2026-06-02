import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CliParserRunnerService } from '../infrastructure/cli-parser-runner.service';
import { ParserRun } from '../infrastructure/persistence/parser-run.entity';

import { parsePlpDoneSummary, type PlpDoneSummary } from './parse-plp-done-summary.util';
import { ParserPlpFileService } from './parser-plp-file.service';
import { ParserRunLogWriter } from './parser-run-log-writer.service';
import { buildParsingChildProcessEnv } from './parsing-env';
import { ParsingRunBucket } from './parsing-run-bucket';
import { ParsingRunChildProcessHost } from './parsing-run-child-process.host';
import { ParsingRunLifecycleService } from './parsing-run-lifecycle.service';
import { stringifyError } from './stringify-error.util';

@Injectable()
export class ParsingPlpRunExecutor {
  private readonly logger = new Logger(ParsingPlpRunExecutor.name);

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
      this.logger.warn(`[PLP][skip-claim] runId=${runId} parser=${run.parser_code}`);
      return bucket;
    }
    const claimedRun = await this.lifecycle.getRun(runId);
    const cfg = claimedRun.config_snapshot;
    const targetEnv = claimedRun.target_env;
    const extraEnv = buildParsingChildProcessEnv(targetEnv);
    const scanMode = String(cfg.scanMode ?? 'first_n');
    const pages = Number(cfg.pages ?? 1);
    const pageFrom =
      cfg.pageFrom !== undefined && cfg.pageFrom !== null ? Number(cfg.pageFrom) : undefined;
    const pageTo = cfg.pageTo !== undefined && cfg.pageTo !== null ? Number(cfg.pageTo) : undefined;
    const login =
      typeof cfg.login === 'string' && cfg.login.trim().length > 0 ? cfg.login.trim() : undefined;
    const pageSize =
      cfg.pageSize !== undefined && cfg.pageSize !== null ? Number(cfg.pageSize) : undefined;
    const maxItems =
      cfg.maxItems !== undefined && cfg.maxItems !== null ? Number(cfg.maxItems) : undefined;
    const delayMs = Number(cfg.delayMs ?? 3000);
    const dryRun = Boolean(cfg.dryRun);
    this.logger.log(
      `[PLP][start] runId=${runId} parser=${claimedRun.parser_code} targetEnv=${targetEnv} scanMode=${scanMode} pages=${pages} pageFrom=${pageFrom ?? '-'} pageTo=${pageTo ?? '-'} dryRun=${dryRun} delayMs=${delayMs}`,
    );
    let doneSummary: PlpDoneSummary | null = null;
    const handle = this.cliRunner.runScan({
      parserCode: claimedRun.parser_code,
      env: targetEnv,
      pages,
      pageFrom,
      pageTo,
      login,
      pageSize,
      maxItems,
      dryRun,
      delayMs,
      extraEnv,
      onStdoutLine: (line) => {
        void this.runLogWriter.append(runId, 'info', line, line);
        doneSummary = parsePlpDoneSummary(line) ?? doneSummary;
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
    if (latest.status === 'cancel_requested') {
      latest.status = 'cancelled';
      latest.finished_at = new Date();
      latest.process_pid = null;
      latest.counters = {
        ...(doneSummary ?? {}),
        exitCode,
      };
      await this.runRepo.save(latest);
      this.logger.warn(
        `[PLP][cancelled] runId=${runId} parser=${latest.parser_code} exitCode=${exitCode}`,
      );
      await this.lifecycle.bumpScheduleAfterRun(latest.schedule_id, latest.started_at);
      return bucket;
    }
    latest.status = exitCode === 0 ? 'completed' : 'failed';
    latest.finished_at = new Date();
    latest.process_pid = null;
    const partial =
      !login &&
      (scanMode === 'range' || (scanMode !== 'all' && scanMode === 'first_n' && pages < 9999));
    const summary = (doneSummary ?? {}) as Partial<PlpDoneSummary>;
    const closeValid = (summary.closeValid ?? 0) > 0;
    latest.counters = {
      ...(doneSummary ?? {}),
      exitCode,
      plpCloseEstimate: closeValid ? (summary.closeEstimate ?? 0) : null,
      plpCloseEstimateReason: closeValid ? null : partial ? 'insufficient_scope' : 'not_computed',
    };
    latest.source_status_summary = {
      scanMode,
      pages,
      pageFrom: pageFrom ?? null,
      pageTo: pageTo ?? null,
      login: login ?? null,
      pageSize: pageSize ?? null,
      maxItems: maxItems ?? null,
      closeValid,
      activeItems: summary.activeItems ?? null,
      missingCandidates: summary.missingCandidates ?? null,
      closedItems: summary.closedItems ?? null,
    };
    if (exitCode !== 0) {
      latest.error_summary = processErrorMessage ?? `CLI exited with code ${exitCode}`;
    }
    await this.runRepo.save(latest);
    this.logger.log(
      `[PLP][finish] runId=${runId} parser=${latest.parser_code} status=${latest.status} exitCode=${exitCode} counters=${JSON.stringify(latest.counters ?? {})}`,
    );
    if (exitCode === 0 && !dryRun) {
      await this.plpFileService.syncPlpFileToS3(latest);
    }
    await this.lifecycle.bumpScheduleAfterRun(latest.schedule_id, latest.started_at);
    return bucket;
  }
}
