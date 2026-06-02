import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CliParserRunnerService } from '../infrastructure/cli-parser-runner.service';
import { ParserRun } from '../infrastructure/persistence/parser-run.entity';

import { getParserCatalogItem } from './parser-catalog';
import { ParserPlpFileService } from './parser-plp-file.service';
import { ParserRunLogWriter } from './parser-run-log-writer.service';
import { buildParsingChildProcessEnv } from './parsing-env';
import { ParsingRunBucket } from './parsing-run-bucket';
import { ParsingRunChildProcessHost } from './parsing-run-child-process.host';
import { ParsingRunLifecycleService } from './parsing-run-lifecycle.service';
import { stringifyError } from './stringify-error.util';

@Injectable()
export class ParsingPdpRunExecutor {
  private readonly logger = new Logger(ParsingPdpRunExecutor.name);

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
    let reportPath: string | null = null;
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
      this.logger.warn(`[PDP][skip-claim] runId=${runId} parser=${run.parser_code}`);
      return bucket;
    }
    const claimedRun = await this.lifecycle.getRun(runId);
    const cfg = claimedRun.config_snapshot;
    const targetEnv = claimedRun.target_env;
    const extraEnv = buildParsingChildProcessEnv(targetEnv);
    const catalogItem = getParserCatalogItem(claimedRun.parser_code);
    const defaults = catalogItem?.pdpDefaults ?? {};
    const listingStatus = String(cfg.listingStatus ?? defaults.listingStatus ?? 'paused') as
      | 'active'
      | 'paused';
    const limit = cfg.limit !== undefined && cfg.limit !== null ? Number(cfg.limit) : undefined;
    const resume = Boolean(cfg.resume ?? defaults.resume ?? false);
    const dryRun = Boolean(cfg.dryRun ?? defaults.dryRun ?? false);
    const onlyFailed = Boolean(cfg.onlyFailed ?? defaults.onlyFailed ?? false);
    const updateExisting = Boolean(cfg.updateExisting ?? defaults.updateExisting ?? false);
    const registrationType = String(cfg.registrationType ?? defaults.registrationType ?? 'Local');
    const defaultHp = Number(cfg.defaultHp ?? defaults.defaultHp ?? 100);
    const parserDefaultCity = catalogItem?.defaultPdpCity;
    const city = String(cfg.city ?? parserDefaultCity ?? '').trim();
    if (!city) {
      throw new Error('PDP run city is required');
    }
    const delayMs = Number(cfg.delayMs ?? defaults.delayMs ?? 3000);
    const removeClosed = Boolean(cfg.removeClosed ?? defaults.removeClosed ?? false);
    const cfgSnap = cfg as Record<string, unknown>;
    const legacyAuto = Boolean(cfgSnap.autoCreateBrandsModels);
    const autoCreateBrands = Boolean(
      cfgSnap.autoCreateBrands ??
      legacyAuto ??
      (defaults as { autoCreateBrands?: boolean }).autoCreateBrands ??
      false,
    );
    const autoCreateModels = Boolean(
      cfgSnap.autoCreateModels ??
      legacyAuto ??
      (defaults as { autoCreateModels?: boolean }).autoCreateModels ??
      false,
    );
    const plpFileKey = String(cfg.plpFileKey ?? '').trim();
    await this.plpFileService.ensurePlpFileLocal(claimedRun.parser_code, plpFileKey);
    const plpFilePath = this.plpFileService.resolvePdpPlpFilePath(
      claimedRun.parser_code,
      plpFileKey,
    );
    const userId = claimedRun.assigned_user_id;
    if (!userId) {
      throw new Error('PDP run requires assigned_user_id');
    }
    this.logger.log(
      `[PDP][start] runId=${runId} parser=${claimedRun.parser_code} assignedUserId=${userId} targetEnv=${targetEnv} status=${listingStatus} limit=${limit ?? '-'} resume=${resume} dryRun=${dryRun} removeClosed=${removeClosed} onlyFailed=${onlyFailed} updateExisting=${updateExisting} autoCreateBrands=${autoCreateBrands} autoCreateModels=${autoCreateModels} registrationType=${registrationType} defaultHp=${defaultHp} city=${city} delayMs=${delayMs}`,
    );
    const handle = this.cliRunner.runImport({
      parserCode: claimedRun.parser_code,
      env: targetEnv,
      userId,
      status: listingStatus,
      limit,
      resume,
      dryRun,
      removeClosed,
      onlyFailed,
      updateExisting,
      registrationType,
      defaultHp,
      city,
      delayMs,
      plpFilePath,
      checkUserDuplicatesBeforeCreate: Boolean(cfg.checkUserDuplicatesBeforeCreate),
      autoCreateBrands,
      autoCreateModels,
      extraEnv,
      onStdoutLine: (line) => {
        void this.runLogWriter.append(runId, 'info', line, line);
        const m = line.match(/file=([^\s]+)\s*$/);
        if (m && line.includes('REPORT')) {
          reportPath = m[1];
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
      reportPath,
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
        `[PDP][cancelled] runId=${runId} parser=${latest.parser_code} exitCode=${exitCode}`,
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
      `[PDP][finish] runId=${runId} parser=${latest.parser_code} status=${latest.status} exitCode=${exitCode} reportPath=${latest.report_storage_key ?? '-'} counters=${JSON.stringify(latest.counters ?? {})}`,
    );
    await this.lifecycle.bumpScheduleAfterRun(latest.schedule_id, latest.started_at);
    return bucket;
  }
}
