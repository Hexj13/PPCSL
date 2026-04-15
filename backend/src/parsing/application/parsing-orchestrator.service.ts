import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import * as fs from 'node:fs';
import { promises as fsp } from 'node:fs';
import * as path from 'node:path';

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThan, Repository } from 'typeorm';

import { AdminAuditService } from '../../admin/admin-audit.service';
import { AdminService } from '../../admin/admin.service';
import type { AuditAction, AuditEntityType } from '../../admin/entities/admin-audit-log.entity';
import { buildPaginationMeta } from '../../common/utils/pagination.utils';
import type { ParserRunType, ParserTargetEnv } from '../domain/types';
import { CliParserRunnerService } from '../infrastructure/cli-parser-runner.service';
import { ParserLogChunk } from '../infrastructure/persistence/parser-log-chunk.entity';
import { ParserRun } from '../infrastructure/persistence/parser-run.entity';
import { ParserSchedule } from '../infrastructure/persistence/parser-schedule.entity';

import { getParserCatalog, getParserCatalogItem } from './parser-catalog';
import {
  buildParsingChildProcessEnv,
  resolveParsingCancelGraceMs,
  resolveParsingTargetEnv,
} from './parsing-env';

interface ActiveChild {
  child: ChildProcessWithoutNullStreams;
  killTimer: ReturnType<typeof setTimeout> | null;
}

interface PlpDoneSummary {
  pagesScanned: number;
  cardsFound: number;
  newItems: number;
  duplicates: number;
  existingListings: number;
  readyForImport: number;
  missingCandidates: number;
  closeEstimate: number;
  closeValid: number;
  activeItems: number;
  closedItems: number;
}

interface ParserPlpFileOption {
  key: string;
  fileName: string;
  label: string;
  updatedAt: string | null;
  itemsCount: number | null;
}

interface ParserPlpFileInfo {
  parserCode: string;
  parserLabel: string;
  fileName: string;
  fileKey: string;
  label: string;
  lastUpdatedAt: string | null;
  itemsCount: number;
  errorItemsCount: number;
  missingCandidatesCount: number;
  fileSizeBytes: number;
}

@Injectable()
export class ParsingOrchestratorService {
  private static readonly LOG_BUFFER_SIZE = 50;
  private static readonly LOG_FLUSH_DELAY_MS = 250;
  private readonly logger = new Logger(ParsingOrchestratorService.name);
  private readonly activeChildren = new Map<string, ActiveChild>();
  private readonly logSeq = new Map<string, number>();
  private readonly logBuffers = new Map<string, ParserLogChunk[]>();
  private readonly logFlushTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly logFlushChains = new Map<string, Promise<void>>();

  constructor(
    @InjectRepository(ParserRun)
    private readonly runRepo: Repository<ParserRun>,
    @InjectRepository(ParserLogChunk)
    private readonly logChunkRepo: Repository<ParserLogChunk>,
    @InjectRepository(ParserSchedule)
    private readonly scheduleRepo: Repository<ParserSchedule>,
    private readonly cliRunner: CliParserRunnerService,
    private readonly adminAudit: AdminAuditService,
    private readonly adminService: AdminService,
  ) {}

  async listRuns(params: { runType: ParserRunType; page: number; limit: number }): Promise<{
    data: ParserRun[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const qb = this.runRepo
      .createQueryBuilder('r')
      .where('r.run_type = :runType', { runType: params.runType })
      .orderBy('r.created_at', 'DESC');
    const total = await qb.getCount();
    const data = await qb
      .skip((params.page - 1) * params.limit)
      .take(params.limit)
      .getMany();
    return {
      data,
      meta: buildPaginationMeta(total, params.page, params.limit),
    };
  }

  async getRun(id: string): Promise<ParserRun> {
    const run = await this.runRepo.findOne({ where: { id } });
    if (!run) {
      throw new NotFoundException('errors.parserRunNotFound');
    }
    return run;
  }

  async getLogChunks(runId: string, afterSeq: number): Promise<ParserLogChunk[]> {
    return this.logChunkRepo.find({
      where: { run_id: runId, seq: MoreThan(afterSeq) },
      order: { seq: 'ASC' },
      take: 500,
    });
  }

  async getReportViewModel(runId: string): Promise<Record<string, unknown>> {
    const run = await this.getRun(runId);
    const fallbackAssignedUserId = run.assigned_user_id;
    if (!run.report_storage_key) {
      return {
        summary: run.counters ?? {},
        userId: fallbackAssignedUserId,
        assignedUserId: fallbackAssignedUserId,
        errorSummary: run.error_summary,
      };
    }
    const rawPath = run.report_storage_key;
    if (!fs.existsSync(rawPath)) {
      return {
        summary: run.counters ?? {},
        userId: fallbackAssignedUserId,
        assignedUserId: fallbackAssignedUserId,
        missing: true,
        errorSummary: run.error_summary,
      };
    }
    const raw = JSON.parse(await fsp.readFile(rawPath, 'utf-8')) as Record<string, unknown>;
    const reportUserId =
      typeof raw.userId === 'string' && raw.userId.trim().length > 0
        ? raw.userId
        : fallbackAssignedUserId;
    return {
      summary: (raw.summary as Record<string, unknown>) ?? run.counters ?? {},
      flags: raw.flags,
      failedItems: raw.failedItems,
      manualReviewItems: raw.manualReviewItems,
      unmappedValues: raw.unmappedValues,
      userId: reportUserId,
      assignedUserId: reportUserId,
      errorSummary: run.error_summary,
    };
  }

  async getCurrentPlpFileViewModel(runId: string): Promise<Record<string, unknown>> {
    const run = await this.getRun(runId);
    if (run.run_type !== 'plp') {
      throw new BadRequestException('errors.parserRunNotFound');
    }
    const filePath = this.resolveCurrentPlpFilePath(run);
    if (!fs.existsSync(filePath)) {
      return {
        fileName: path.basename(filePath),
        missing: true,
        content: null,
      };
    }
    return {
      fileName: path.basename(filePath),
      missing: false,
      content: await fsp.readFile(filePath, 'utf-8'),
    };
  }

  async createPlpRun(params: {
    adminUserId: string;
    parserCode: string;
    assignedUserId?: string;
    scanMode?: 'first_n' | 'range' | 'all';
    pagesFirst?: number;
    pageFrom?: number;
    pageTo?: number;
    login?: string;
    pageSize?: number;
    maxItems?: number;
    delayMs: number;
    resume?: boolean;
    dryRun?: boolean;
    removeClosed?: boolean;
  }): Promise<ParserRun> {
    const targetEnv = resolveParsingTargetEnv();
    this.logger.log(
      `[PLP][create] parser=${params.parserCode} adminUserId=${params.adminUserId} targetEnv=${targetEnv} scanMode=${params.scanMode}`,
    );
    await this.assertNoActiveRun(params.parserCode, 'plp', targetEnv);
    const catalog = getParserCatalogItem(params.parserCode);
    if (!catalog || !catalog.manualRunEnabled || catalog.adminAvailability !== 'enabled') {
      throw new BadRequestException('errors.parsingParserNotAvailablePlp');
    }
    const scanInputMode = catalog.scanInputMode ?? 'pages';
    let pages = 1;
    let pageFrom: number | undefined;
    let pageTo: number | undefined;
    let scanMode: 'first_n' | 'range' | 'all' | 'profile_login' = 'first_n';
    let login: string | undefined;
    let pageSize: number | undefined;
    let maxItems: number | undefined;
    if (scanInputMode === 'profile_login') {
      scanMode = 'profile_login';
      const nextLogin = params.login?.trim() ?? '';
      if (!nextLogin) {
        throw new BadRequestException('errors.parsingLoginRequired');
      }
      login = nextLogin;
      const resolvedPageSize = Number(params.pageSize ?? 50);
      if (!Number.isFinite(resolvedPageSize) || resolvedPageSize <= 0) {
        throw new BadRequestException('errors.parsingPagesFirstInvalid');
      }
      pageSize = resolvedPageSize;
      if (params.maxItems !== undefined) {
        const resolvedMaxItems = Number(params.maxItems);
        if (!Number.isFinite(resolvedMaxItems) || resolvedMaxItems <= 0) {
          throw new BadRequestException('errors.parsingPagesFirstInvalid');
        }
        maxItems = resolvedMaxItems;
      }
    } else if ((params.scanMode ?? 'first_n') === 'first_n') {
      scanMode = 'first_n';
      const n = params.pagesFirst ?? 0;
      if (!Number.isFinite(n) || n <= 0) {
        throw new BadRequestException('errors.parsingPagesFirstInvalid');
      }
      pages = n;
    } else if (params.scanMode === 'range') {
      scanMode = 'range';
      const from = params.pageFrom ?? 0;
      const to = params.pageTo ?? 0;
      if (!Number.isFinite(from) || from < 1 || !Number.isFinite(to) || to < from) {
        throw new BadRequestException('errors.parsingPageRangeInvalid');
      }
      pageFrom = from;
      pageTo = to;
      pages = to;
    } else {
      scanMode = 'all';
      pages = 9999;
    }
    const configSnapshot: Record<string, unknown> = {
      scanMode,
      pages,
      pageFrom,
      pageTo,
      login,
      pageSize,
      maxItems,
      delayMs: params.delayMs,
      resume: Boolean(params.resume),
      dryRun: Boolean(params.dryRun),
      removeClosed: Boolean(params.removeClosed),
    };
    this.resolvePlpOutputFileKey(params.parserCode, configSnapshot);
    const run = this.runRepo.create({
      parser_code: params.parserCode,
      run_type: 'plp',
      domain: catalog.domain,
      assigned_user_id: params.assignedUserId?.trim() || null,
      target_env: targetEnv,
      trigger_mode: 'manual',
      schedule_id: null,
      status: 'queued',
      config_snapshot: configSnapshot,
      created_by_admin_user_id: params.adminUserId,
    });
    const saved = await this.runRepo.save(run);
    this.logger.log(
      `[PLP][queued] runId=${saved.id} parser=${saved.parser_code} trigger=${saved.trigger_mode} targetEnv=${saved.target_env}`,
    );
    await this.logAudit(params.adminUserId, 'PARSING_PLP_RUN_CREATE', 'PARSER_RUN', saved.id, {
      parserCode: params.parserCode,
      runType: 'plp',
      targetEnv,
      status: 'success',
      meta: { runId: saved.id },
    });
    setImmediate(() => {
      void this.executePlpRun(saved.id).catch((error) => {
        this.logger.error(`PLP run ${saved.id} failed: ${String(error)}`);
      });
    });
    return this.getRun(saved.id);
  }

  async createPdpRun(params: {
    adminUserId: string;
    parserCode: string;
    assignedUserId: string;
    plpFileKey: string;
    listingStatus: 'active' | 'paused';
    limit?: number;
    resume?: boolean;
    dryRun?: boolean;
    onlyFailed?: boolean;
    updateExisting?: boolean;
    registrationType: string;
    defaultHp: number;
    city: string;
    delayMs: number;
    removeClosed?: boolean;
  }): Promise<ParserRun> {
    const targetEnv = resolveParsingTargetEnv();
    this.logger.log(
      `[PDP][create] parser=${params.parserCode} adminUserId=${params.adminUserId} assignedUserId=${params.assignedUserId} targetEnv=${targetEnv}`,
    );
    await this.assertNoActiveRun(params.parserCode, 'pdp', targetEnv);
    const catalog = getParserCatalogItem(params.parserCode);
    if (!catalog || !catalog.manualRunEnabled || catalog.adminAvailability !== 'enabled') {
      throw new BadRequestException('errors.parsingParserNotAvailablePdp');
    }
    const validation = await this.adminService.validateAssignUser(params.assignedUserId);
    if (!validation.valid) {
      throw new BadRequestException(validation.error ?? 'errors.invalidUserId');
    }
    const plpFilePath = this.resolvePdpPlpFilePath(params.parserCode, params.plpFileKey);
    const configSnapshot: Record<string, unknown> = {
      listingStatus: params.listingStatus,
      limit: params.limit,
      resume: Boolean(params.resume),
      dryRun: Boolean(params.dryRun),
      onlyFailed: Boolean(params.onlyFailed),
      updateExisting: Boolean(params.updateExisting),
      registrationType: params.registrationType,
      defaultHp: params.defaultHp,
      city: params.city,
      delayMs: params.delayMs,
      removeClosed: Boolean(params.removeClosed),
      dataSource: 'plp_registry',
      plpFileKey: params.plpFileKey,
      plpFilePath,
    };
    const run = this.runRepo.create({
      parser_code: params.parserCode,
      run_type: 'pdp',
      domain: catalog.domain,
      assigned_user_id: params.assignedUserId,
      target_env: targetEnv,
      trigger_mode: 'manual',
      schedule_id: null,
      status: 'queued',
      config_snapshot: configSnapshot,
      created_by_admin_user_id: params.adminUserId,
    });
    const saved = await this.runRepo.save(run);
    this.logger.log(
      `[PDP][queued] runId=${saved.id} parser=${saved.parser_code} assignedUserId=${saved.assigned_user_id} trigger=${saved.trigger_mode} targetEnv=${saved.target_env}`,
    );
    await this.logAudit(params.adminUserId, 'PARSING_PDP_RUN_CREATE', 'PARSER_RUN', saved.id, {
      parserCode: params.parserCode,
      runType: 'pdp',
      targetEnv,
      status: 'success',
      meta: { runId: saved.id },
    });
    setImmediate(() => {
      void this.executePdpRun(saved.id).catch((error) => {
        this.logger.error(`PDP run ${saved.id} failed: ${String(error)}`);
      });
    });
    return this.getRun(saved.id);
  }

  async createRunFromSchedule(
    schedule: ParserSchedule,
    plannedRunAt?: Date | null,
  ): Promise<ParserRun | null> {
    const targetEnv = resolveParsingTargetEnv();
    if (schedule.target_env !== targetEnv) {
      this.logger.warn(
        `[SCHEDULER][skip] scheduleId=${schedule.id} parser=${schedule.parser_code} runType=${schedule.run_type} reason=target_env_mismatch scheduleEnv=${schedule.target_env} currentEnv=${targetEnv}`,
      );
      return null;
    }
    try {
      await this.assertNoActiveRun(schedule.parser_code, schedule.run_type, targetEnv);
    } catch {
      this.logger.warn(
        `Skipping schedule ${schedule.id}: active run exists for ${schedule.parser_code}/${schedule.run_type}`,
      );
      return null;
    }
    this.logger.log(
      `[SCHEDULER][trigger] scheduleId=${schedule.id} parser=${schedule.parser_code} runType=${schedule.run_type} targetEnv=${targetEnv} plannedRunAt=${plannedRunAt?.toISOString() ?? '-'}`,
    );
    const configSnapshot = { ...schedule.config_snapshot };
    if (plannedRunAt) {
      configSnapshot.scheduledPlannedRunAt = plannedRunAt.toISOString();
    }
    const run = this.runRepo.create({
      parser_code: schedule.parser_code,
      run_type: schedule.run_type,
      domain: schedule.domain,
      assigned_user_id: schedule.assigned_user_id,
      target_env: targetEnv,
      trigger_mode: 'scheduled',
      schedule_id: schedule.id,
      status: 'queued',
      config_snapshot: configSnapshot,
      created_by_admin_user_id: schedule.created_by_admin_user_id,
    });
    const saved = await this.runRepo.save(run);
    this.logger.log(
      `[SCHEDULER][queued] scheduleId=${schedule.id} runId=${saved.id} parser=${saved.parser_code} runType=${saved.run_type}`,
    );
    setImmediate(() => {
      if (schedule.run_type === 'plp') {
        void this.executePlpRun(saved.id).catch((error) => {
          this.logger.error(`Scheduled PLP run ${saved.id} failed: ${String(error)}`);
        });
      } else {
        void this.executePdpRun(saved.id).catch((error) => {
          this.logger.error(`Scheduled PDP run ${saved.id} failed: ${String(error)}`);
        });
      }
    });
    return this.getRun(saved.id);
  }

  async requestCancelRun(runId: string, adminUserId: string): Promise<ParserRun> {
    const run = await this.getRun(runId);
    this.logger.warn(
      `[RUN][cancel-request] runId=${run.id} parser=${run.parser_code} runType=${run.run_type} status=${run.status} adminUserId=${adminUserId}`,
    );
    if (!['queued', 'in_progress', 'cancel_requested'].includes(run.status)) {
      throw new BadRequestException('errors.parsingRunCannotCancel');
    }
    if (run.status === 'queued' && !this.activeChildren.has(runId)) {
      run.status = 'cancelled';
      run.cancel_requested_at = new Date();
      run.finished_at = new Date();
      await this.runRepo.save(run);
      await this.logAudit(adminUserId, 'PARSING_RUN_CANCEL', 'PARSER_RUN', run.id, {
        parserCode: run.parser_code,
        runType: run.run_type,
        targetEnv: run.target_env,
        status: 'success',
        meta: { runId: run.id, immediate: true },
      });
      return run;
    }
    run.status = 'cancel_requested';
    run.cancel_requested_at = new Date();
    await this.runRepo.save(run);
    await this.logAudit(adminUserId, 'PARSING_RUN_CANCEL', 'PARSER_RUN', run.id, {
      parserCode: run.parser_code,
      runType: run.run_type,
      targetEnv: run.target_env,
      status: 'success',
      meta: { runId: run.id },
    });
    const active = this.activeChildren.get(runId);
    if (active) {
      this.cliRunner.stopGraceful(active.child);
      const grace = resolveParsingCancelGraceMs();
      active.killTimer = setTimeout(() => {
        const current = this.activeChildren.get(runId);
        if (current && !current.child.killed) {
          this.cliRunner.stopForce(current.child);
        }
      }, grace);
    }
    return run;
  }

  private async assertNoActiveRun(
    parserCode: string,
    runType: ParserRunType,
    targetEnv: ParserTargetEnv,
  ): Promise<void> {
    const existing = await this.runRepo
      .createQueryBuilder('r')
      .where('r.parser_code = :parserCode', { parserCode })
      .andWhere('r.run_type = :runType', { runType })
      .andWhere('r.target_env = :targetEnv', { targetEnv })
      .andWhere('r.status IN (:...st)', { st: ['queued', 'in_progress', 'cancel_requested'] })
      .getOne();
    if (existing) {
      throw new BadRequestException('errors.parsingActiveRunExists');
    }
  }

  private async executePlpRun(runId: string): Promise<void> {
    let processErrorMessage: string | null = null;
    try {
      const run = await this.getRun(runId);
      if (run.status === 'cancel_requested' || run.status === 'cancelled') {
        if (run.status !== 'cancelled') {
          run.status = 'cancelled';
          run.finished_at = new Date();
          await this.runRepo.save(run);
        }
        return;
      }
      const cfg = run.config_snapshot;
      const targetEnv = run.target_env;
      const extraEnv = buildParsingChildProcessEnv(targetEnv);
      run.status = 'in_progress';
      run.started_at = new Date();
      await this.runRepo.save(run);
      const scanMode = String(cfg.scanMode ?? 'first_n');
      const pages = Number(cfg.pages ?? 1);
      const pageFrom =
        cfg.pageFrom !== undefined && cfg.pageFrom !== null ? Number(cfg.pageFrom) : undefined;
      const pageTo =
        cfg.pageTo !== undefined && cfg.pageTo !== null ? Number(cfg.pageTo) : undefined;
      const login =
        typeof cfg.login === 'string' && cfg.login.trim().length > 0 ? cfg.login.trim() : undefined;
      const pageSize =
        cfg.pageSize !== undefined && cfg.pageSize !== null ? Number(cfg.pageSize) : undefined;
      const maxItems =
        cfg.maxItems !== undefined && cfg.maxItems !== null ? Number(cfg.maxItems) : undefined;
      const delayMs = Number(cfg.delayMs ?? 3000);
      const removeClosed = Boolean(cfg.removeClosed);
      const resume = Boolean(cfg.resume);
      const dryRun = Boolean(cfg.dryRun);
      this.logger.log(
        `[PLP][start] runId=${runId} parser=${run.parser_code} targetEnv=${targetEnv} scanMode=${scanMode} pages=${pages} pageFrom=${pageFrom ?? '-'} pageTo=${pageTo ?? '-'} resume=${resume} dryRun=${dryRun} removeClosed=${removeClosed} delayMs=${delayMs}`,
      );
      let doneSummary: PlpDoneSummary | null = null;
      const handle = this.cliRunner.runScan({
        parserCode: run.parser_code,
        env: targetEnv,
        pages,
        pageFrom,
        pageTo,
        login,
        pageSize,
        maxItems,
        resume,
        dryRun,
        removeClosed,
        delayMs,
        extraEnv,
        onStdoutLine: (line) => {
          void this.appendLogLine(runId, 'info', line, line);
          doneSummary = this.parsePlpDoneSummary(line) ?? doneSummary;
        },
        onStderrLine: (line) => {
          void this.appendLogLine(runId, 'error', line, line);
        },
        onProcessError: (error) => {
          processErrorMessage = this.stringifyError(error);
          void this.appendLogLine(runId, 'error', processErrorMessage, processErrorMessage);
        },
      });
      this.activeChildren.set(runId, { child: handle.child, killTimer: null });
      await this.runRepo.update(runId, { process_pid: handle.pid });
      const exitCode = await this.waitForChild(handle.child);
      this.clearChildTimers(runId);
      this.activeChildren.delete(runId);
      await this.flushLogBuffer(runId);
      this.cleanupRunLoggingState(runId);
      const latest = await this.getRun(runId);
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
        await this.bumpScheduleAfterRun(latest.schedule_id, latest.started_at);
        return;
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
      await this.bumpScheduleAfterRun(latest.schedule_id, latest.started_at);
    } catch (error) {
      await this.failRun(runId, error);
    }
  }

  private parsePlpDoneSummary(line: string): PlpDoneSummary | null {
    const full = line.match(
      /\[DONE\] pagesScanned=(\d+) cardsFound=(\d+) new=(\d+) duplicates=(\d+) existingListings=(\d+) readyForImport=(\d+) missingCandidates=(\d+) closeEstimate=(\d+) closeValid=(\d+) activeItems=(\d+) closedItems=(\d+)/,
    );
    if (full) {
      return {
        pagesScanned: Number(full[1]),
        cardsFound: Number(full[2]),
        newItems: Number(full[3]),
        duplicates: Number(full[4]),
        existingListings: Number(full[5]),
        readyForImport: Number(full[6]),
        missingCandidates: Number(full[7]),
        closeEstimate: Number(full[8]),
        closeValid: Number(full[9]),
        activeItems: Number(full[10]),
        closedItems: Number(full[11]),
      };
    }

    const compact = line.match(/\[DONE\] pages=(\d+) cardsFound=(\d+) new=(\d+) duplicates=(\d+)/);
    if (!compact) {
      return null;
    }
    return {
      pagesScanned: Number(compact[1]),
      cardsFound: Number(compact[2]),
      newItems: Number(compact[3]),
      duplicates: Number(compact[4]),
      existingListings: 0,
      readyForImport: Number(compact[3]),
      missingCandidates: 0,
      closeEstimate: 0,
      closeValid: 0,
      activeItems: 0,
      closedItems: 0,
    };
  }

  async listParserPlpFiles(parserCode: string): Promise<ParserPlpFileOption[]> {
    const parser = getParserCatalogItem(parserCode);
    if (!parser) {
      throw new NotFoundException('errors.parserRunNotFound');
    }

    const allFiles = await this.listAllPlpFiles();
    return allFiles
      .filter((item) => item.parserCode === parserCode)
      .map((item) => ({
        key: item.fileKey,
        fileName: item.fileName,
        label: item.label,
        updatedAt: item.lastUpdatedAt,
        itemsCount: item.itemsCount,
      }));
  }

  async listAllPlpFiles(): Promise<ParserPlpFileInfo[]> {
    const result: ParserPlpFileInfo[] = [];
    const parsers = getParserCatalog().filter((parser) => parser.supportedRunTypes.includes('plp'));

    for (const parser of parsers) {
      if (parser.scanInputMode === 'profile_login') {
        const dirPath = this.get999mdCurrentPlpDir();
        if (!fs.existsSync(dirPath)) {
          continue;
        }
        const files = (await fsp.readdir(dirPath))
          .filter((name) => name.endsWith('.json'))
          .sort((a, b) => a.localeCompare(b));
        for (const fileName of files) {
          const rawPath = path.join(dirPath, fileName);
          result.push(
            await this.buildParserPlpFileInfo(
              parser.code,
              parser.label,
              fileName,
              fileName,
              rawPath,
            ),
          );
        }
        continue;
      }

      if (!parser.plpDataPath) {
        continue;
      }
      const rawPath = this.resolveParserPlpDataPath(parser.plpDataPath);
      if (!fs.existsSync(rawPath)) {
        continue;
      }
      const fileName = path.basename(parser.plpDataPath);
      result.push(
        await this.buildParserPlpFileInfo(parser.code, parser.label, fileName, 'default', rawPath),
      );
    }

    return result.sort((a, b) => {
      const left = a.lastUpdatedAt ? new Date(a.lastUpdatedAt).getTime() : 0;
      const right = b.lastUpdatedAt ? new Date(b.lastUpdatedAt).getTime() : 0;
      if (right !== left) {
        return right - left;
      }
      if (a.parserLabel !== b.parserLabel) {
        return a.parserLabel.localeCompare(b.parserLabel);
      }
      return a.fileName.localeCompare(b.fileName);
    });
  }

  async getPlpFileContentByKey(
    parserCode: string,
    fileKey: string,
  ): Promise<{
    fileName: string;
    missing: boolean;
    content: string | null;
  }> {
    const filePath = this.resolvePdpPlpFilePath(parserCode, fileKey);
    if (!fs.existsSync(filePath)) {
      return {
        fileName: path.basename(filePath),
        missing: true,
        content: null,
      };
    }
    return {
      fileName: path.basename(filePath),
      missing: false,
      content: await fsp.readFile(filePath, 'utf-8'),
    };
  }

  async deletePlpFile(parserCode: string, fileKey: string): Promise<void> {
    const rawPath = this.resolvePdpPlpFilePath(parserCode, fileKey);
    if (!fs.existsSync(rawPath)) {
      throw new BadRequestException('errors.parsingPlpFileInvalid');
    }
    await fsp.unlink(rawPath);
  }

  private async executePdpRun(runId: string): Promise<void> {
    let reportPath: string | null = null;
    let processErrorMessage: string | null = null;
    try {
      const run = await this.getRun(runId);
      if (run.status === 'cancel_requested' || run.status === 'cancelled') {
        if (run.status !== 'cancelled') {
          run.status = 'cancelled';
          run.finished_at = new Date();
          await this.runRepo.save(run);
        }
        return;
      }
      const cfg = run.config_snapshot;
      const targetEnv = run.target_env;
      const extraEnv = buildParsingChildProcessEnv(targetEnv);
      run.status = 'in_progress';
      run.started_at = new Date();
      await this.runRepo.save(run);
      const listingStatus = String(cfg.listingStatus ?? 'paused') as 'active' | 'paused';
      const limit = cfg.limit !== undefined && cfg.limit !== null ? Number(cfg.limit) : undefined;
      const resume = Boolean(cfg.resume);
      const dryRun = Boolean(cfg.dryRun);
      const onlyFailed = Boolean(cfg.onlyFailed);
      const updateExisting = Boolean(cfg.updateExisting);
      const registrationType = String(cfg.registrationType ?? 'Local');
      const defaultHp = Number(cfg.defaultHp ?? 150);
      const parserDefaultCity = getParserCatalogItem(run.parser_code)?.defaultPdpCity;
      const city = String(cfg.city ?? parserDefaultCity ?? '').trim();
      if (!city) {
        throw new Error('PDP run city is required');
      }
      const delayMs = Number(cfg.delayMs ?? 3000);
      const removeClosed = Boolean(cfg.removeClosed);
      const plpFileKey = String(cfg.plpFileKey ?? '').trim();
      const plpFilePath = this.resolvePdpPlpFilePath(run.parser_code, plpFileKey);
      const userId = run.assigned_user_id;
      if (!userId) {
        throw new Error('PDP run requires assigned_user_id');
      }
      this.logger.log(
        `[PDP][start] runId=${runId} parser=${run.parser_code} assignedUserId=${userId} targetEnv=${targetEnv} status=${listingStatus} limit=${limit ?? '-'} resume=${resume} dryRun=${dryRun} removeClosed=${removeClosed} onlyFailed=${onlyFailed} updateExisting=${updateExisting} registrationType=${registrationType} defaultHp=${defaultHp} city=${city} delayMs=${delayMs}`,
      );
      const handle = this.cliRunner.runImport({
        parserCode: run.parser_code,
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
        extraEnv,
        onStdoutLine: (line) => {
          void this.appendLogLine(runId, 'info', line, line);
          const m = line.match(/file=([^\s]+)\s*$/);
          if (m && line.includes('REPORT')) {
            reportPath = m[1];
          }
        },
        onStderrLine: (line) => {
          void this.appendLogLine(runId, 'error', line, line);
        },
        onProcessError: (error) => {
          processErrorMessage = this.stringifyError(error);
          void this.appendLogLine(runId, 'error', processErrorMessage, processErrorMessage);
        },
      });
      this.activeChildren.set(runId, { child: handle.child, killTimer: null });
      await this.runRepo.update(runId, { process_pid: handle.pid });
      const exitCode = await this.waitForChild(handle.child);
      this.clearChildTimers(runId);
      this.activeChildren.delete(runId);
      await this.flushLogBuffer(runId);
      this.cleanupRunLoggingState(runId);
      const latest = await this.getRun(runId);
      const resolvedReportPath = await this.resolvePdpReportPath(run, reportPath);
      const resolvedCounters = await this.resolvePdpCounters(resolvedReportPath, exitCode);
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
        await this.bumpScheduleAfterRun(latest.schedule_id, latest.started_at);
        return;
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
      await this.bumpScheduleAfterRun(latest.schedule_id, latest.started_at);
    } catch (error) {
      await this.failRun(runId, error);
    }
  }

  private async bumpScheduleAfterRun(
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

  async reconcileStaleActiveRunsOnStartup(): Promise<number> {
    const targetEnv = resolveParsingTargetEnv();
    const stale = await this.runRepo.find({
      where: {
        target_env: targetEnv,
        status: In(['queued', 'in_progress', 'cancel_requested']),
      },
      order: { created_at: 'ASC' },
      take: 200,
    });
    if (stale.length === 0) {
      return 0;
    }
    const finishedAt = new Date();
    for (const run of stale) {
      run.status = 'failed';
      run.finished_at = finishedAt;
      run.process_pid = null;
      run.error_summary = run.error_summary ?? 'Run marked as failed after server restart';
      run.counters = {
        ...(run.counters ?? {}),
        exitCode: 1,
        restartRecovered: true,
      };
    }
    await this.runRepo.save(stale);
    return stale.length;
  }

  private clearChildTimers(runId: string): void {
    const active = this.activeChildren.get(runId);
    if (active?.killTimer) {
      clearTimeout(active.killTimer);
    }
  }

  private waitForChild(child: ChildProcessWithoutNullStreams): Promise<number> {
    return new Promise((resolve) => {
      child.once('close', (code) => {
        resolve(code ?? 0);
      });
      child.once('error', () => {
        resolve(1);
      });
    });
  }

  private async appendLogLine(
    runId: string,
    level: string,
    message: string,
    rawLine: string,
  ): Promise<void> {
    const consoleLine = `[RUN][${runId}][${level}] ${message}`;
    if (level === 'error') {
      this.logger.error(consoleLine);
    } else if (level === 'warn' || level === 'warning') {
      this.logger.warn(consoleLine);
    } else {
      this.logger.log(consoleLine);
    }
    const next = (this.logSeq.get(runId) ?? 0) + 1;
    this.logSeq.set(runId, next);
    const chunk = this.logChunkRepo.create({
      run_id: runId,
      seq: next,
      level,
      message: message.slice(0, 8000),
      raw_line: rawLine.slice(0, 8000),
    });
    const buffer = this.logBuffers.get(runId) ?? [];
    buffer.push(chunk);
    this.logBuffers.set(runId, buffer);

    if (buffer.length >= ParsingOrchestratorService.LOG_BUFFER_SIZE) {
      await this.flushLogBuffer(runId);
      return;
    }

    if (!this.logFlushTimers.has(runId)) {
      const timer = setTimeout(() => {
        this.logFlushTimers.delete(runId);
        void this.flushLogBuffer(runId);
      }, ParsingOrchestratorService.LOG_FLUSH_DELAY_MS);
      this.logFlushTimers.set(runId, timer);
    }
  }

  private async flushLogBuffer(runId: string): Promise<void> {
    const buffered = this.logBuffers.get(runId);
    if (!buffered || buffered.length === 0) {
      return;
    }
    this.logBuffers.set(runId, []);
    const toInsert = buffered.map((chunk) => ({
      run_id: chunk.run_id,
      seq: chunk.seq,
      level: chunk.level,
      message: chunk.message,
      raw_line: chunk.raw_line,
    }));
    const previous = this.logFlushChains.get(runId) ?? Promise.resolve();
    const next = previous
      .catch(() => undefined)
      .then(async () => {
        if (toInsert.length > 0) {
          await this.logChunkRepo.insert(toInsert);
        }
      });
    this.logFlushChains.set(runId, next);
    await next;
    if (this.logFlushChains.get(runId) === next) {
      this.logFlushChains.delete(runId);
    }
  }

  private cleanupRunLoggingState(runId: string): void {
    const timer = this.logFlushTimers.get(runId);
    if (timer) {
      clearTimeout(timer);
      this.logFlushTimers.delete(runId);
    }
    this.logBuffers.delete(runId);
    this.logFlushChains.delete(runId);
    this.logSeq.delete(runId);
  }

  private stringifyError(error: unknown): string {
    if (error instanceof Error) {
      return error.stack?.trim() || error.message;
    }
    return String(error);
  }

  private resolveCurrentPlpFilePath(run: ParserRun): string {
    if (run.parser_code === '999md') {
      const loginRaw = run.config_snapshot?.login;
      if (typeof loginRaw === 'string' && loginRaw.trim().length > 0) {
        const loginSlug = this.toLoginFileSlug(loginRaw);
        return path.join(this.get999mdCurrentPlpDir(), `${loginSlug}.json`);
      }
    }

    const parser = getParserCatalogItem(run.parser_code);
    if (parser?.plpDataPath) {
      return this.resolveParserPlpDataPath(parser.plpDataPath);
    }
    throw new NotFoundException('errors.parserRunNotFound');
  }

  getParserPlpMode(parserCode: string): 'mono' | 'multi' {
    const parser = getParserCatalogItem(parserCode);
    if (!parser) {
      throw new NotFoundException('errors.parserRunNotFound');
    }
    return parser.plpMode;
  }

  resolvePlpOutputFileKey(parserCode: string, configSnapshot: Record<string, unknown>): string {
    const parser = getParserCatalogItem(parserCode);
    if (!parser) {
      throw new NotFoundException('errors.parserRunNotFound');
    }
    let fileKey = 'default';
    if (parser.scanInputMode === 'profile_login') {
      const loginRaw = String(configSnapshot.login ?? '').trim();
      if (!loginRaw) {
        throw new BadRequestException('errors.parsingLoginRequired');
      }
      fileKey = `${this.toLoginFileSlug(loginRaw)}.json`;
    }
    if (parser.plpMode === 'mono' && fileKey !== 'default') {
      throw new BadRequestException('errors.parsingPlpModeMonoSingleFileOnly');
    }
    return fileKey;
  }

  resolvePdpPlpFilePath(parserCode: string, plpFileKey: string): string {
    const key = plpFileKey.trim();
    if (!key) {
      throw new BadRequestException('errors.parsingPlpFileRequired');
    }

    if (parserCode === '999md') {
      if (path.basename(key) !== key || !key.endsWith('.json')) {
        throw new BadRequestException('errors.parsingPlpFileInvalid');
      }
      const runtimePath = path.join(this.get999mdCurrentPlpDir(), key);
      if (fs.existsSync(runtimePath)) {
        return runtimePath;
      }
      const legacyPath = path.join(
        process.cwd(),
        'src',
        'scripts',
        'tools',
        '999md-import',
        'data',
        'current-plp',
        key,
      );
      if (!fs.existsSync(legacyPath)) {
        throw new BadRequestException('errors.parsingPlpFileInvalid');
      }
      return legacyPath;
    }

    const parser = getParserCatalogItem(parserCode);
    if (!parser?.plpDataPath || key !== 'default') {
      throw new BadRequestException('errors.parsingPlpFileInvalid');
    }
    const absPath = this.resolveParserPlpDataPath(parser.plpDataPath);
    if (!fs.existsSync(absPath)) {
      throw new BadRequestException('errors.parsingPlpFileInvalid');
    }
    return absPath;
  }

  private getParsingRuntimeRoot(): string {
    const fromEnv = process.env.PARSING_RUNTIME_DIR?.trim();
    if (fromEnv) {
      return path.isAbsolute(fromEnv) ? fromEnv : path.join(process.cwd(), fromEnv);
    }
    return path.join(process.cwd(), 'runtime', 'parsing');
  }

  private get999mdCurrentPlpDir(): string {
    return path.join(this.getParsingRuntimeRoot(), '999md', 'current-plp');
  }

  private async resolvePdpReportPath(
    run: Pick<ParserRun, 'parser_code' | 'started_at'>,
    capturedReportPath: string | null,
  ): Promise<string | null> {
    if (capturedReportPath && fs.existsSync(capturedReportPath)) {
      return capturedReportPath;
    }
    return this.findLatestParserRunReportPath(run.parser_code, run.started_at);
  }

  private async resolvePdpCounters(
    reportPath: string | null,
    exitCode: number,
  ): Promise<Record<string, unknown>> {
    if (!reportPath || !fs.existsSync(reportPath)) {
      return { exitCode };
    }
    try {
      const report = JSON.parse(await fsp.readFile(reportPath, 'utf-8')) as {
        summary?: Record<string, unknown>;
      };
      return { ...(report.summary ?? {}), exitCode };
    } catch {
      return { exitCode };
    }
  }

  private async findLatestParserRunReportPath(
    parserCode: string,
    startedAt: Date | null,
  ): Promise<string | null> {
    const reportsDir = this.getParserReportsDir(parserCode);
    if (!reportsDir || !fs.existsSync(reportsDir)) {
      return null;
    }
    const runPrefix = `${parserCode}-run-`;
    let names: string[] = [];
    try {
      names = await fsp.readdir(reportsDir);
    } catch {
      return null;
    }
    const thresholdMs = startedAt ? startedAt.getTime() - 2000 : Number.NEGATIVE_INFINITY;
    const candidates: Array<{ filePath: string; mtimeMs: number }> = [];
    for (const name of names) {
      if (!name.startsWith(runPrefix) || !name.endsWith('.json')) {
        continue;
      }
      const filePath = path.join(reportsDir, name);
      try {
        const stat = await fsp.stat(filePath);
        if (!stat.isFile() || stat.mtimeMs < thresholdMs) {
          continue;
        }
        candidates.push({ filePath, mtimeMs: stat.mtimeMs });
      } catch {
        continue;
      }
    }
    if (candidates.length === 0) {
      return null;
    }
    candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
    return candidates[0].filePath;
  }

  private getParserReportsDir(parserCode: string): string | null {
    const parser = getParserCatalogItem(parserCode);
    if (!parser?.cliScript) {
      return null;
    }
    const parserDir = path.dirname(parser.cliScript);
    return path.join(process.cwd(), 'src', 'scripts', 'tools', parserDir, 'reports');
  }

  private resolveParserPlpDataPath(plpDataPath: string): string {
    if (path.isAbsolute(plpDataPath)) {
      return plpDataPath;
    }
    if (plpDataPath.startsWith('runtime/')) {
      return path.join(process.cwd(), plpDataPath);
    }
    return path.join(process.cwd(), 'src', 'scripts', 'tools', plpDataPath);
  }

  private async buildParserPlpFileInfo(
    parserCode: string,
    parserLabel: string,
    fileName: string,
    fileKey: string,
    rawPath: string,
  ): Promise<ParserPlpFileInfo> {
    let label = fileName;
    let lastUpdatedAt: string | null = null;
    let itemsCount = 0;
    let errorItemsCount = 0;
    let missingCandidatesCount = 0;

    try {
      const parsed = JSON.parse(await fsp.readFile(rawPath, 'utf-8')) as {
        login?: unknown;
        items?: Record<string, unknown>;
        meta?: Record<string, unknown>;
      };
      const meta = parsed.meta ?? {};
      const login = typeof parsed.login === 'string' ? parsed.login.trim() : '';
      if (login.length > 0) {
        label = `${login} (${fileName})`;
      }
      if (typeof meta.lastUpdatedAt === 'string' && meta.lastUpdatedAt.trim().length > 0) {
        lastUpdatedAt = meta.lastUpdatedAt;
      }
      const rawItems = parsed.items && typeof parsed.items === 'object' ? parsed.items : {};
      const itemList = Object.values(rawItems);
      const metaItemsCount =
        typeof meta.activeItemsCount === 'number'
          ? Number(meta.activeItemsCount)
          : typeof meta.totalItems === 'number'
            ? Number(meta.totalItems)
            : null;
      itemsCount = metaItemsCount ?? itemList.length;
      errorItemsCount = itemList.filter((item) => {
        if (!item || typeof item !== 'object') {
          return false;
        }
        const errorValue = (item as { error?: unknown }).error;
        return typeof errorValue === 'string' && errorValue.trim().length > 0;
      }).length;
      missingCandidatesCount =
        typeof meta.missingCandidatesCount === 'number' ? Number(meta.missingCandidatesCount) : 0;
    } catch {
      label = fileName;
    }

    let fileSizeBytes = 0;
    try {
      fileSizeBytes = (await fsp.stat(rawPath)).size;
    } catch {
      fileSizeBytes = 0;
    }

    return {
      parserCode,
      parserLabel,
      fileName,
      fileKey,
      label,
      lastUpdatedAt,
      itemsCount,
      errorItemsCount,
      missingCandidatesCount,
      fileSizeBytes,
    };
  }

  private toLoginFileSlug(login: string): string {
    const normalized = login.trim().toLowerCase();
    if (!normalized) {
      return 'unknown-login';
    }
    return normalized.replace(/[^a-z0-9_-]+/g, '-');
  }

  private async failRun(runId: string, error: unknown): Promise<void> {
    const message = this.stringifyError(error);
    this.clearChildTimers(runId);
    this.activeChildren.delete(runId);
    try {
      await this.appendLogLine(runId, 'error', message, message);
      await this.flushLogBuffer(runId);
    } catch (logError) {
      this.logger.error(
        `[RUN][${runId}][error-log-failed] ${this.stringifyError(logError)} original=${message}`,
      );
    }
    const run = await this.runRepo.findOne({ where: { id: runId } });
    if (!run) {
      this.cleanupRunLoggingState(runId);
      this.logger.error(`[RUN][failed] runId=${runId} error=${message}`);
      return;
    }
    run.status = 'failed';
    run.finished_at = new Date();
    run.process_pid = null;
    run.error_summary = message;
    run.counters = { ...(run.counters ?? {}), exitCode: 1 };
    await this.runRepo.save(run);
    this.cleanupRunLoggingState(runId);
    this.logger.error(`[RUN][failed] runId=${runId} error=${message}`);
    await this.bumpScheduleAfterRun(run.schedule_id, run.started_at ?? run.created_at);
  }

  private async logAudit(
    actorUserId: string,
    action: AuditAction,
    entityType: AuditEntityType,
    entityId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.adminAudit.log(this.runRepo.manager, {
      actorUserId,
      action,
      entityType,
      entityId,
      before: null,
      after: payload,
    });
  }
}
