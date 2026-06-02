import * as fs from 'node:fs';
import { promises as fsp } from 'node:fs';
import * as path from 'node:path';

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThan, Repository } from 'typeorm';

import { AdminAuditService } from '../../admin/admin-audit.service';
import { AdminUsersService } from '../../admin/admin-users.service';
import type { AuditAction, AuditEntityType } from '../../admin/entities/admin-audit-log.entity';
import { buildPaginationMeta } from '../../common/utils/pagination.utils';
import type { ParserRunType, ParserTargetEnv } from '../domain/types';
import { CliParserRunnerService } from '../infrastructure/cli-parser-runner.service';
import { ParserLogChunk } from '../infrastructure/persistence/parser-log-chunk.entity';
import { ParserRun } from '../infrastructure/persistence/parser-run.entity';
import { ParserSchedule } from '../infrastructure/persistence/parser-schedule.entity';
import { PlpStorageService } from '../infrastructure/plp-storage.service';

import { getParserCatalog, getParserCatalogItem } from './parser-catalog';
import {
  ParserPlpFileInfo,
  ParserPlpFileOption,
  buildPlpFileInfoFromContent,
  sortPlpFileInfoList,
} from './parser-plp-file-info.util';
import { ParserPlpFileService } from './parser-plp-file.service';
import {
  normalizeSyncPlpFileKey,
  resolveS3RelativePath,
  toLoginFileSlug,
} from './parser-plp-path.util';
import { ParserRunLogWriter } from './parser-run-log-writer.service';
import { resolveParsingCancelGraceMs, resolveParsingTargetEnv } from './parsing-env';
import { ParsingPdpRunExecutor } from './parsing-pdp-run-executor.service';
import { ParsingPlpRunExecutor } from './parsing-plp-run-executor.service';
import type { ParsingRunBucket } from './parsing-run-bucket';
import { ParsingRunChildProcessHost } from './parsing-run-child-process.host';
import { ParsingRunLifecycleService } from './parsing-run-lifecycle.service';
import { ParsingSyncRunExecutor } from './parsing-sync-run-executor.service';

@Injectable()
export class ParsingOrchestratorService {
  private readonly logger = new Logger(ParsingOrchestratorService.name);

  constructor(
    @InjectRepository(ParserRun)
    private readonly runRepo: Repository<ParserRun>,
    @InjectRepository(ParserLogChunk)
    private readonly logChunkRepo: Repository<ParserLogChunk>,
    @InjectRepository(ParserSchedule)
    private readonly scheduleRepo: Repository<ParserSchedule>,
    private readonly cliRunner: CliParserRunnerService,
    private readonly plpStorage: PlpStorageService,
    private readonly adminAudit: AdminAuditService,
    private readonly adminService: AdminUsersService,
    private readonly runLogWriter: ParserRunLogWriter,
    private readonly plpFileService: ParserPlpFileService,
    private readonly runLifecycle: ParsingRunLifecycleService,
    private readonly childHost: ParsingRunChildProcessHost,
    private readonly plpRunExecutor: ParsingPlpRunExecutor,
    private readonly pdpRunExecutor: ParsingPdpRunExecutor,
    private readonly syncRunExecutor: ParsingSyncRunExecutor,
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
    return this.runLifecycle.getRun(id);
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
      duplicateSkippedItems: raw.duplicateSkippedItems,
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
    const fileKey = this.plpFileService.resolvePlpOutputFileKey(
      run.parser_code,
      run.config_snapshot,
    );
    const storageRelPath = resolveS3RelativePath(run.parser_code, fileKey);
    const fileName = path.basename(storageRelPath);
    const content = await this.plpStorage.downloadFile(storageRelPath);
    if (content === null) {
      return { fileName, missing: true, content: null };
    }
    return { fileName, missing: false, content };
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
    dryRun?: boolean;
  }): Promise<ParserRun> {
    const targetEnv = resolveParsingTargetEnv();
    this.logger.log(
      `[PLP][create] parser=${params.parserCode} adminUserId=${params.adminUserId} targetEnv=${targetEnv} scanMode=${params.scanMode}`,
    );
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
      dryRun: Boolean(params.dryRun),
    };
    this.plpFileService.resolvePlpOutputFileKey(params.parserCode, configSnapshot);
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
    this.scheduleTryStartNextQueuedRun(saved.parser_code, 'plp', saved.target_env);
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
    checkUserDuplicatesBeforeCreate?: boolean;
    autoCreateBrands?: boolean;
    autoCreateModels?: boolean;
    autoCreateBrandsModels?: boolean;
  }): Promise<ParserRun> {
    const targetEnv = resolveParsingTargetEnv();
    this.logger.log(
      `[PDP][create] parser=${params.parserCode} adminUserId=${params.adminUserId} assignedUserId=${params.assignedUserId} targetEnv=${targetEnv}`,
    );
    const catalog = getParserCatalogItem(params.parserCode);
    if (!catalog || !catalog.manualRunEnabled || catalog.adminAvailability !== 'enabled') {
      throw new BadRequestException('errors.parsingParserNotAvailablePdp');
    }
    const validation = await this.adminService.validateAssignUser(params.assignedUserId);
    if (!validation.valid) {
      throw new BadRequestException(validation.error ?? 'errors.invalidUserId');
    }
    const plpFilePath = this.plpFileService.resolvePdpPlpFilePath(
      params.parserCode,
      params.plpFileKey,
    );
    const defaults = catalog?.pdpDefaults ?? {};
    const legacyAuto = Boolean(params.autoCreateBrandsModels);
    const autoCreateBrands = Boolean(
      params.autoCreateBrands ??
      legacyAuto ??
      (defaults as { autoCreateBrands?: boolean }).autoCreateBrands ??
      false,
    );
    const autoCreateModels = Boolean(
      params.autoCreateModels ??
      legacyAuto ??
      (defaults as { autoCreateModels?: boolean }).autoCreateModels ??
      false,
    );
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
      checkUserDuplicatesBeforeCreate: Boolean(params.checkUserDuplicatesBeforeCreate),
      autoCreateBrands,
      autoCreateModels,
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
    this.scheduleTryStartNextQueuedRun(saved.parser_code, 'pdp', saved.target_env);
    return this.getRun(saved.id);
  }

  async getRegistrySyncHint(
    parserCode: string,
    plpFileKey: string,
  ): Promise<{
    login: string | null;
    suggestedAssignedUserId: string | null;
    plpLoginMatchesFileKey: boolean;
  }> {
    const catalog = getParserCatalogItem(parserCode);
    if (
      !catalog ||
      catalog.adminAvailability !== 'enabled' ||
      !catalog.supportedRunTypes.includes('pdp')
    ) {
      throw new BadRequestException('errors.parsingRegistrySyncUnavailable');
    }
    const file = await this.getPlpFileContentByKey(parserCode, plpFileKey);
    if (file.missing || !file.content) {
      throw new BadRequestException('errors.parsingPlpFileInvalid');
    }
    let login: string | null = null;
    try {
      const parsed = JSON.parse(file.content) as { login?: unknown };
      if (typeof parsed.login === 'string' && parsed.login.trim()) {
        login = parsed.login.trim();
      }
    } catch {
      login = null;
    }
    let plpLoginMatchesFileKey = true;
    if (parserCode === '999md' && login) {
      const expectedKey = normalizeSyncPlpFileKey(`${toLoginFileSlug(login)}.json`);
      plpLoginMatchesFileKey = expectedKey === normalizeSyncPlpFileKey(plpFileKey);
    }
    const suggestedAssignedUserId = await this.plpFileService.suggestAssignedUserIdForPlpFile(
      parserCode,
      plpFileKey,
    );
    return { login, suggestedAssignedUserId, plpLoginMatchesFileKey };
  }

  async createSyncRun(params: {
    adminUserId: string;
    parserCode: string;
    plpFileKey: string;
    assignedUserId?: string;
  }): Promise<ParserRun> {
    const targetEnv = resolveParsingTargetEnv();
    const catalog = getParserCatalogItem(params.parserCode);
    if (!catalog?.registrySyncEnabled || catalog.adminAvailability !== 'enabled') {
      throw new BadRequestException('errors.parsingRegistrySyncUnavailable');
    }
    if (
      params.parserCode !== 'cipauto' &&
      params.parserCode !== '999md' &&
      params.parserCode !== 'autooutlet'
    ) {
      throw new BadRequestException('errors.parsingRegistrySyncUnavailable');
    }
    const file = await this.getPlpFileContentByKey(params.parserCode, params.plpFileKey);
    if (file.missing || !file.content) {
      throw new BadRequestException('errors.parsingPlpFileInvalid');
    }
    let loginFromPlp: string | undefined;
    if (params.parserCode === '999md') {
      try {
        const parsed = JSON.parse(file.content) as { login?: unknown };
        if (typeof parsed.login === 'string' && parsed.login.trim()) {
          loginFromPlp = parsed.login.trim();
        }
      } catch {
        loginFromPlp = undefined;
      }
      if (!loginFromPlp) {
        throw new BadRequestException('errors.parsingLoginRequired');
      }
      const expectedKey = normalizeSyncPlpFileKey(`${toLoginFileSlug(loginFromPlp)}.json`);
      if (expectedKey !== normalizeSyncPlpFileKey(params.plpFileKey)) {
        throw new BadRequestException('errors.parsingPlpFileInvalid');
      }
    }
    const hinted = await this.plpFileService.suggestAssignedUserIdForPlpFile(
      params.parserCode,
      params.plpFileKey,
    );
    const userId = params.assignedUserId?.trim() || hinted || '';
    if (!userId) {
      throw new BadRequestException('errors.parsingSyncAssignedUserRequired');
    }
    const validation = await this.adminService.validateAssignUser(userId);
    if (!validation.valid) {
      throw new BadRequestException(validation.error ?? 'errors.invalidUserId');
    }
    const configSnapshot: Record<string, unknown> = {
      syncKind: 'registry_seed',
      plpFileKey: params.plpFileKey.trim(),
      login: loginFromPlp,
    };
    const run = this.runRepo.create({
      parser_code: params.parserCode,
      run_type: 'sync',
      domain: catalog.domain,
      assigned_user_id: userId,
      target_env: targetEnv,
      trigger_mode: 'manual',
      schedule_id: null,
      status: 'queued',
      config_snapshot: configSnapshot,
      created_by_admin_user_id: params.adminUserId,
    });
    const saved = await this.runRepo.save(run);
    this.logger.log(
      `[SYNC][queued] runId=${saved.id} parser=${saved.parser_code} assignedUserId=${saved.assigned_user_id} targetEnv=${targetEnv}`,
    );
    await this.logAudit(params.adminUserId, 'PARSING_SYNC_RUN_CREATE', 'PARSER_RUN', saved.id, {
      parserCode: params.parserCode,
      runType: 'sync',
      targetEnv,
      status: 'success',
      meta: { runId: saved.id, plpFileKey: params.plpFileKey },
    });
    this.scheduleTryStartNextQueuedRun(saved.parser_code, 'sync', saved.target_env);
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
    this.scheduleTryStartNextQueuedRun(saved.parser_code, saved.run_type, saved.target_env);
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
    if (run.status === 'queued' && !this.childHost.getActive(runId)) {
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
      this.scheduleTryStartNextQueuedRun(run.parser_code, run.run_type, run.target_env);
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
    const active = this.childHost.getActive(runId);
    if (active) {
      this.cliRunner.stopGraceful(active.child);
      const grace = resolveParsingCancelGraceMs();
      this.childHost.setKillTimer(
        runId,
        setTimeout(() => {
          const current = this.childHost.getActive(runId);
          if (current && !current.child.killed) {
            this.cliRunner.stopForce(current.child);
          }
        }, grace),
      );
    }
    return run;
  }

  private scheduleTryStartNextQueuedRun(
    parserCode: string,
    runType: ParserRunType,
    targetEnv: ParserTargetEnv,
  ): void {
    setImmediate(() => {
      void this.tryStartNextQueuedRun(parserCode, runType, targetEnv).catch((error) => {
        this.logger.error(`[QUEUE] tryStartNextQueuedRun failed: ${String(error)}`);
      });
    });
  }

  private async tryStartNextQueuedRun(
    parserCode: string,
    runType: ParserRunType,
    targetEnv: ParserTargetEnv,
  ): Promise<void> {
    const blocker = await this.runRepo.findOne({
      where: {
        parser_code: parserCode,
        run_type: runType,
        target_env: targetEnv,
        status: In(['in_progress', 'cancel_requested']),
      },
    });
    if (blocker) {
      return;
    }
    const next = await this.runRepo.findOne({
      where: {
        parser_code: parserCode,
        run_type: runType,
        target_env: targetEnv,
        status: 'queued',
      },
      order: { created_at: 'ASC', id: 'ASC' },
    });
    if (!next) {
      return;
    }
    this.logger.log(
      `[QUEUE][dequeue] runId=${next.id} parser=${parserCode} runType=${runType} targetEnv=${targetEnv}`,
    );
    if (runType === 'plp') {
      setImmediate(() => {
        void this.executePlpRun(next.id).catch((error) => {
          this.logger.error(`PLP run ${next.id} failed: ${String(error)}`);
        });
      });
    } else if (runType === 'pdp') {
      setImmediate(() => {
        void this.executePdpRun(next.id).catch((error) => {
          this.logger.error(`PDP run ${next.id} failed: ${String(error)}`);
        });
      });
    } else if (runType === 'sync') {
      setImmediate(() => {
        void this.executeSyncRun(next.id).catch((error) => {
          this.logger.error(`SYNC run ${next.id} failed: ${String(error)}`);
        });
      });
    }
  }

  private async runWithExecutor(
    runId: string,
    executor: { run: (id: string) => Promise<ParsingRunBucket | null> },
  ): Promise<void> {
    let bucket: ParsingRunBucket | null = null;
    try {
      bucket = await executor.run(runId);
    } catch (error) {
      await this.runLifecycle.failRun(runId, error);
    } finally {
      if (bucket?.tracked) {
        this.scheduleTryStartNextQueuedRun(bucket.parserCode, bucket.runType, bucket.targetEnv);
      }
    }
  }

  private async executePlpRun(runId: string): Promise<void> {
    await this.runWithExecutor(runId, this.plpRunExecutor);
  }

  private async executePdpRun(runId: string): Promise<void> {
    await this.runWithExecutor(runId, this.pdpRunExecutor);
  }

  private async executeSyncRun(runId: string): Promise<void> {
    await this.runWithExecutor(runId, this.syncRunExecutor);
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
    return this.listAllPlpFilesViaStorage();
  }

  private async listAllPlpFilesViaStorage(): Promise<ParserPlpFileInfo[]> {
    const result: ParserPlpFileInfo[] = [];
    const parsers = getParserCatalog().filter((p) => p.supportedRunTypes.includes('plp'));

    for (const parser of parsers) {
      if (parser.scanInputMode === 'profile_login') {
        const files = await this.plpStorage.listFiles('999md/current-plp/');
        for (const relPath of files) {
          const content = await this.plpStorage.downloadFile(relPath);
          if (content === null) {
            continue;
          }
          const fileName = path.basename(relPath);
          const meta = await this.plpStorage.getFileMetadata(relPath);
          result.push(
            buildPlpFileInfoFromContent(
              parser.code,
              parser.label,
              fileName,
              fileName,
              content,
              meta?.size ?? content.length,
            ),
          );
        }
        continue;
      }
      if (!parser.plpDataPath) {
        continue;
      }
      const s3Path = resolveS3RelativePath(parser.code, 'default');
      const content = await this.plpStorage.downloadFile(s3Path);
      if (content === null) {
        continue;
      }
      const meta = await this.plpStorage.getFileMetadata(s3Path);
      const fileName = path.basename(parser.plpDataPath);
      result.push(
        buildPlpFileInfoFromContent(
          parser.code,
          parser.label,
          fileName,
          'default',
          content,
          meta?.size ?? content.length,
        ),
      );
    }

    return sortPlpFileInfoList(result);
  }

  async getPlpFileContentByKey(
    parserCode: string,
    fileKey: string,
  ): Promise<{
    fileName: string;
    missing: boolean;
    content: string | null;
  }> {
    const storageRelPath = resolveS3RelativePath(parserCode, fileKey);
    const fileName = path.basename(storageRelPath);
    const content = await this.plpStorage.downloadFile(storageRelPath);
    if (content === null) {
      return { fileName, missing: true, content: null };
    }
    return { fileName, missing: false, content };
  }

  async deletePlpFile(parserCode: string, fileKey: string): Promise<void> {
    const storageRelPath = resolveS3RelativePath(parserCode, fileKey);
    const exists = (await this.plpStorage.getFileMetadata(storageRelPath)) !== null;
    if (!exists) {
      throw new BadRequestException('errors.parsingPlpFileInvalid');
    }
    await this.plpStorage.deleteFile(storageRelPath);
  }

  async reconcileStaleActiveRunsOnStartup(): Promise<number> {
    const targetEnv = resolveParsingTargetEnv();
    const stale = await this.runRepo.find({
      where: {
        target_env: targetEnv,
        status: In(['in_progress', 'cancel_requested']),
      },
      order: { created_at: 'ASC' },
      take: 200,
    });
    if (stale.length > 0) {
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
    }
    const queuedRuns = await this.runRepo.find({
      where: { target_env: targetEnv, status: 'queued' },
      order: { created_at: 'ASC' },
      take: 500,
    });
    const bucketKeys = new Set<string>();
    for (const run of queuedRuns) {
      bucketKeys.add(`${run.parser_code}\0${run.run_type}\0${run.target_env}`);
    }
    for (const key of bucketKeys) {
      const [parserCode, runType, env] = key.split('\0');
      if (parserCode && runType && (env === 'local' || env === 'prod')) {
        this.scheduleTryStartNextQueuedRun(
          parserCode,
          runType as ParserRunType,
          env as ParserTargetEnv,
        );
      }
    }
    return stale.length;
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
