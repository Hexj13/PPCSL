import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual, Repository } from 'typeorm';

import { AdminAuditService } from '../../admin/admin-audit.service';
import { AdminUsersService } from '../../admin/admin-users.service';
import type { AuditAction, AuditEntityType } from '../../admin/entities/admin-audit-log.entity';
import { buildPaginationMeta } from '../../common/utils/pagination.utils';
import type { ParserRunType, ParserScheduleStatus, ParserTargetEnv } from '../domain/types';
import { ParserSchedule } from '../infrastructure/persistence/parser-schedule.entity';

import { getParserCatalogItem } from './parser-catalog';
import { ParserPlpFileService } from './parser-plp-file.service';
import { ParsingAvailabilityService } from './parsing-availability.service';
import { resolveParsingTargetEnv } from './parsing-env';
import { ParsingOrchestratorService } from './parsing-orchestrator.service';
import {
  computeNextRunAtFromCron,
  computeNextRunAtFromCronAfter,
} from './parsing-schedule-next-run';
import { presetToCronExpression, type FrequencyPresetKind } from './parsing-schedule-presets';

function parseEveryNDaysFromCronExpression(cronExpression: string): number | null {
  const parts = cronExpression.trim().split(/\s+/);
  if (parts.length < 3) {
    return null;
  }
  const dayOfMonthPart = parts[2];
  const match = dayOfMonthPart.match(/^\*\/(\d+)$/);
  if (!match) {
    return null;
  }
  const parsed = Number(match[1]);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 30) {
    return null;
  }
  return parsed;
}

export interface ClaimedParserSchedule {
  schedule: ParserSchedule;
  plannedRunAt: Date;
}

@Injectable()
export class ParsingScheduleService {
  private readonly logger = new Logger(ParsingScheduleService.name);

  constructor(
    @InjectRepository(ParserSchedule)
    private readonly scheduleRepo: Repository<ParserSchedule>,
    private readonly adminAudit: AdminAuditService,
    private readonly adminService: AdminUsersService,
    private readonly orchestrator: ParsingOrchestratorService,
    private readonly plpFileService: ParserPlpFileService,
    private readonly availability: ParsingAvailabilityService,
  ) {}

  async listSchedules(params: { page: number; limit: number }): Promise<{
    data: ParserSchedule[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const qb = this.scheduleRepo
      .createQueryBuilder('s')
      .where('s.deleted_at IS NULL')
      .orderBy('s.next_run_at', 'ASC', 'NULLS LAST')
      .addOrderBy('s.updated_at', 'DESC');
    const total = await qb.getCount();
    const data = await qb
      .skip((params.page - 1) * params.limit)
      .take(params.limit)
      .getMany();
    this.reconcileListedSiteAvailability(data);
    return {
      data,
      meta: buildPaginationMeta(total, params.page, params.limit),
    };
  }

  async getSchedule(id: string): Promise<ParserSchedule> {
    const s = await this.scheduleRepo.findOne({ where: { id, deleted_at: IsNull() } });
    if (!s) {
      throw new NotFoundException('errors.parsingScheduleNotFound');
    }
    return s;
  }

  async createSchedule(params: {
    adminUserId: string;
    parserCode: string;
    runType: ParserRunType;
    assignedUserId?: string;
    frequencyPreset: FrequencyPresetKind | string;
    everyNHours?: number;
    everyNDays?: number;
    presetTime?: string;
    presetWeekday?: string;
    cronExpression?: string;
    timezone?: string;
    configSnapshot: Record<string, unknown>;
    ip?: string;
    userAgent?: string;
  }): Promise<ParserSchedule> {
    const targetEnv = resolveParsingTargetEnv();
    this.logger.log(
      `[SCHEDULE][create] parser=${params.parserCode} runType=${params.runType} adminUserId=${params.adminUserId} targetEnv=${targetEnv} frequency=${params.frequencyPreset}`,
    );
    const catalog = getParserCatalogItem(params.parserCode);
    if (!catalog || !catalog.schedulerEnabled || catalog.adminAvailability !== 'enabled') {
      throw new BadRequestException('errors.parsingParserNotAvailableSchedule');
    }
    let assignedUserId: string | null = null;
    if (params.runType === 'pdp') {
      assignedUserId = params.assignedUserId?.trim() || null;
      if (!assignedUserId) {
        throw new BadRequestException('errors.parsingLoginRequired');
      }
      const validation = await this.adminService.validateAssignUser(assignedUserId);
      if (!validation.valid) {
        throw new BadRequestException(validation.error ?? 'errors.invalidUserId');
      }
      const plpFileKey = String(params.configSnapshot?.plpFileKey ?? '').trim();
      this.plpFileService.resolvePdpPlpFilePath(params.parserCode, plpFileKey);
    }
    if (params.runType === 'plp') {
      const plpFileKey = this.plpFileService.resolvePlpOutputFileKey(
        params.parserCode,
        params.configSnapshot,
      );
      await this.assertPlpScheduleFileRules({
        parserCode: params.parserCode,
        targetEnv,
        parserPlpMode: catalog.plpMode,
        plpFileKey,
      });
    }
    const timezone = params.timezone?.trim() || 'Europe/Chisinau';
    let cronExpression: string;
    if (params.frequencyPreset === 'custom') {
      if (!params.cronExpression?.trim()) {
        throw new BadRequestException('validation.parsingCronExpressionRequired');
      }
      cronExpression = params.cronExpression.trim();
    } else if (params.frequencyPreset === 'every_n_hours') {
      const n = params.everyNHours ?? 0;
      if (!Number.isFinite(n) || n < 1) {
        throw new BadRequestException('validation.parsingEveryNHoursRequired');
      }
      cronExpression = presetToCronExpression('every_n_hours', { everyNHours: n });
    } else if (params.frequencyPreset === 'every_n_days') {
      const n = params.everyNDays ?? 0;
      if (!Number.isFinite(n) || n < 1 || n > 30) {
        throw new BadRequestException('validation.parsingEveryNDaysRequired');
      }
      cronExpression = presetToCronExpression('every_n_days', {
        everyNDays: n,
        presetTime: params.presetTime,
      });
    } else {
      cronExpression = presetToCronExpression(params.frequencyPreset as FrequencyPresetKind, {
        everyNHours: params.everyNHours,
        everyNDays: params.everyNDays,
        presetTime: params.presetTime,
        presetWeekday: params.presetWeekday,
      });
    }
    let nextRunAt: Date;
    try {
      nextRunAt = this.computeNextRunAtByPreset({
        frequencyPreset: params.frequencyPreset,
        cronExpression,
        timezone,
        from: new Date(),
        everyNDays: params.everyNDays,
      });
    } catch {
      throw new BadRequestException('validation.parsingCronInvalid');
    }
    const entity = this.scheduleRepo.create({
      parser_code: params.parserCode,
      run_type: params.runType,
      domain: catalog.domain,
      assigned_user_id: assignedUserId,
      target_env: targetEnv,
      cron_expression: cronExpression,
      frequency_preset: String(params.frequencyPreset),
      timezone,
      status: 'active',
      config_snapshot: params.configSnapshot,
      next_run_at: nextRunAt,
      created_by_admin_user_id: params.adminUserId,
    });
    const saved = await this.scheduleRepo.save(entity);
    this.logger.log(
      `[SCHEDULE][created] scheduleId=${saved.id} parser=${saved.parser_code} runType=${saved.run_type} cron=${saved.cron_expression} nextRunAt=${saved.next_run_at?.toISOString() ?? '-'}`,
    );
    await this.logScheduleAudit(
      params.adminUserId,
      'PARSING_SCHEDULE_CREATE',
      saved.id,
      null,
      {
        scheduleId: saved.id,
        parserCode: saved.parser_code,
        runType: saved.run_type,
        targetEnv: saved.target_env,
      },
      params.ip,
      params.userAgent,
    );
    this.scheduleAvailabilityRefresh(saved.id);
    return this.getSchedule(saved.id);
  }

  async updateSchedule(params: {
    id: string;
    adminUserId: string;
    frequencyPreset?: FrequencyPresetKind | string;
    everyNHours?: number;
    everyNDays?: number;
    presetTime?: string;
    presetWeekday?: string;
    cronExpression?: string;
    timezone?: string;
    configSnapshot?: Record<string, unknown>;
    ip?: string;
    userAgent?: string;
  }): Promise<ParserSchedule> {
    const existing = await this.getSchedule(params.id);
    this.logger.log(
      `[SCHEDULE][update] scheduleId=${existing.id} adminUserId=${params.adminUserId} frequency=${params.frequencyPreset ?? existing.frequency_preset ?? '-'} timezone=${params.timezone ?? existing.timezone}`,
    );
    const before = { ...existing } as unknown as Record<string, unknown>;
    if (params.configSnapshot) {
      if (existing.run_type === 'pdp') {
        const plpFileKey = String(params.configSnapshot?.plpFileKey ?? '').trim();
        this.plpFileService.resolvePdpPlpFilePath(existing.parser_code, plpFileKey);
      }
      if (existing.run_type === 'plp') {
        const plpFileKey = this.plpFileService.resolvePlpOutputFileKey(
          existing.parser_code,
          params.configSnapshot,
        );
        await this.assertPlpScheduleFileRules({
          parserCode: existing.parser_code,
          targetEnv: existing.target_env,
          parserPlpMode: this.plpFileService.getParserPlpMode(existing.parser_code),
          plpFileKey,
          excludeScheduleId: existing.id,
        });
      }
      existing.config_snapshot = params.configSnapshot;
    }
    if (params.timezone) {
      existing.timezone = params.timezone.trim();
    }
    if (params.frequencyPreset) {
      if (params.frequencyPreset === 'custom') {
        if (!params.cronExpression?.trim()) {
          throw new BadRequestException('validation.parsingCronExpressionRequired');
        }
        existing.cron_expression = params.cronExpression.trim();
      } else if (params.frequencyPreset === 'every_n_hours') {
        const n = params.everyNHours ?? 0;
        if (!Number.isFinite(n) || n < 1) {
          throw new BadRequestException('validation.parsingEveryNHoursRequired');
        }
        existing.cron_expression = presetToCronExpression('every_n_hours', { everyNHours: n });
      } else if (params.frequencyPreset === 'every_n_days') {
        const n = params.everyNDays ?? 0;
        if (!Number.isFinite(n) || n < 1 || n > 30) {
          throw new BadRequestException('validation.parsingEveryNDaysRequired');
        }
        existing.cron_expression = presetToCronExpression('every_n_days', {
          everyNDays: n,
          presetTime: params.presetTime,
        });
      } else {
        existing.cron_expression = presetToCronExpression(
          params.frequencyPreset as FrequencyPresetKind,
          {
            everyNHours: params.everyNHours,
            everyNDays: params.everyNDays,
            presetTime: params.presetTime,
            presetWeekday: params.presetWeekday,
          },
        );
      }
      existing.frequency_preset = String(params.frequencyPreset);
    }
    try {
      existing.next_run_at = this.computeNextRunAtByPreset({
        frequencyPreset: existing.frequency_preset,
        cronExpression: existing.cron_expression,
        timezone: existing.timezone,
        from: new Date(),
      });
    } catch {
      throw new BadRequestException('validation.parsingCronInvalid');
    }
    existing.updated_by_admin_user_id = params.adminUserId;
    const saved = await this.scheduleRepo.save(existing);
    this.logger.log(
      `[SCHEDULE][updated] scheduleId=${saved.id} cron=${saved.cron_expression} nextRunAt=${saved.next_run_at?.toISOString() ?? '-'} status=${saved.status}`,
    );
    await this.logScheduleAudit(
      params.adminUserId,
      'PARSING_SCHEDULE_UPDATE',
      saved.id,
      before,
      {
        scheduleId: saved.id,
      },
      params.ip,
      params.userAgent,
    );
    this.scheduleAvailabilityRefresh(saved.id);
    return saved;
  }

  async setScheduleStatus(params: {
    id: string;
    adminUserId: string;
    status: ParserScheduleStatus;
    ip?: string;
    userAgent?: string;
  }): Promise<ParserSchedule> {
    const existing = await this.getSchedule(params.id);
    this.logger.log(
      `[SCHEDULE][status-change] scheduleId=${existing.id} from=${existing.status} to=${params.status} adminUserId=${params.adminUserId}`,
    );
    const before = { status: existing.status };
    const previousStatus = existing.status;
    existing.status = params.status;
    if (params.status === 'active' && previousStatus !== 'active') {
      existing.next_run_at = this.computeNextRunAtByPreset({
        frequencyPreset: existing.frequency_preset,
        cronExpression: existing.cron_expression,
        timezone: existing.timezone,
        from: new Date(),
      });
    } else if (params.status === 'deactivated' && previousStatus !== 'deactivated') {
      existing.next_run_at = null;
    }
    existing.updated_by_admin_user_id = params.adminUserId;
    const saved = await this.scheduleRepo.save(existing);
    await this.logScheduleAudit(
      params.adminUserId,
      'PARSING_SCHEDULE_STATUS',
      saved.id,
      before,
      {
        scheduleId: saved.id,
        status: saved.status,
      },
      params.ip,
      params.userAgent,
    );
    return saved;
  }

  async softDeleteSchedule(params: {
    id: string;
    adminUserId: string;
    ip?: string;
    userAgent?: string;
  }): Promise<void> {
    const existing = await this.getSchedule(params.id);
    this.logger.warn(
      `[SCHEDULE][delete] scheduleId=${existing.id} parser=${existing.parser_code} runType=${existing.run_type} adminUserId=${params.adminUserId}`,
    );
    existing.deleted_at = new Date();
    existing.updated_by_admin_user_id = params.adminUserId;
    await this.scheduleRepo.save(existing);
    await this.logScheduleAudit(
      params.adminUserId,
      'PARSING_SCHEDULE_DELETE',
      existing.id,
      null,
      {
        scheduleId: existing.id,
        softDeleted: true,
      },
      params.ip,
      params.userAgent,
    );
  }

  async runScheduleNow(params: {
    id: string;
    adminUserId: string;
    ip?: string;
    userAgent?: string;
  }): Promise<{ runId: string | null }> {
    const sch = await this.getSchedule(params.id);
    this.logger.log(
      `[SCHEDULE][run-now] scheduleId=${sch.id} parser=${sch.parser_code} runType=${sch.run_type} adminUserId=${params.adminUserId}`,
    );
    const run = await this.orchestrator.createRunFromSchedule(sch);
    this.logger.log(
      `[SCHEDULE][run-now-result] scheduleId=${sch.id} runId=${run?.id ?? '-'} parser=${sch.parser_code} runType=${sch.run_type}`,
    );
    await this.logScheduleAudit(
      params.adminUserId,
      'PARSING_SCHEDULE_RUN_NOW',
      sch.id,
      null,
      {
        scheduleId: sch.id,
        runId: run?.id ?? null,
      },
      params.ip,
      params.userAgent,
    );
    return { runId: run?.id ?? null };
  }

  private scheduleAvailabilityRefresh(scheduleId: string): void {
    void this.refreshScheduleAvailability(scheduleId).catch((error: unknown) => {
      this.logger.warn(
        `[SCHEDULE][availability-refresh-bg-failed] scheduleId=${scheduleId} error=${error instanceof Error ? error.message : String(error)}`,
      );
    });
  }

  async refreshScheduleAvailability(scheduleId: string): Promise<void> {
    const sch = await this.scheduleRepo.findOne({
      where: { id: scheduleId, deleted_at: IsNull() },
    });
    if (!sch) {
      return;
    }
    this.logger.log(
      `[SCHEDULE][availability-refresh] scheduleId=${sch.id} parser=${sch.parser_code} runType=${sch.run_type}`,
    );
    const probe = await this.availability.probeParserSource({
      parserCode: sch.parser_code,
      kind: sch.run_type === 'pdp' ? 'pdp' : 'plp',
    });
    const checkedAt = new Date();
    const status = probe.ok > 0 && probe.ok === probe.total ? 'available' : 'unavailable';
    const siblings = await this.scheduleRepo
      .createQueryBuilder('s')
      .where('s.deleted_at IS NULL')
      .andWhere('s.parser_code = :parserCode', { parserCode: sch.parser_code })
      .andWhere('s.target_env = :targetEnv', { targetEnv: sch.target_env })
      .andWhere('s.status = :status', { status: 'active' })
      .getMany();
    const toSave = siblings.length > 0 ? siblings : [sch];
    const changed: ParserSchedule[] = [];
    const unchangedIds: string[] = [];
    for (const row of toSave) {
      const statusChanged = row.resource_availability_status !== status;
      const summaryChanged = row.resource_availability_summary !== probe.summary;
      if (statusChanged || summaryChanged) {
        row.resource_availability_checked_at = checkedAt;
        row.resource_availability_scope = { siteProbe: probe };
        row.resource_availability_status = status;
        row.resource_availability_summary = probe.summary;
        changed.push(row);
      } else {
        unchangedIds.push(row.id);
      }
    }
    if (changed.length > 0) {
      await this.scheduleRepo.save(changed);
    }
    if (unchangedIds.length > 0) {
      await this.scheduleRepo
        .createQueryBuilder()
        .update(ParserSchedule)
        .set({ resource_availability_checked_at: checkedAt })
        .where('id IN (:...unchangedIds)', { unchangedIds })
        .execute();
    }
    this.logger.log(
      `[SCHEDULE][availability-result] scheduleId=${sch.id} parser=${sch.parser_code} status=${status} summary="${probe.summary}" syncedSchedules=${toSave.length}`,
    );
  }

  async findDueSchedules(now: Date, limit: number): Promise<ParserSchedule[]> {
    const targetEnv = resolveParsingTargetEnv();
    return this.scheduleRepo.find({
      where: {
        status: 'active',
        deleted_at: IsNull(),
        target_env: targetEnv,
        next_run_at: LessThanOrEqual(now),
      },
      order: { next_run_at: 'ASC' },
      take: limit,
    });
  }

  async claimDueSchedules(now: Date, limit: number): Promise<ClaimedParserSchedule[]> {
    const targetEnv = resolveParsingTargetEnv();
    return this.scheduleRepo.manager.transaction(async (manager) => {
      const repo = manager.getRepository(ParserSchedule);
      const due = await repo
        .createQueryBuilder('s')
        .where('s.status = :status', { status: 'active' })
        .andWhere('s.deleted_at IS NULL')
        .andWhere('s.target_env = :targetEnv', { targetEnv })
        .andWhere('s.next_run_at IS NOT NULL')
        .andWhere('s.next_run_at <= :now', { now })
        .orderBy('s.next_run_at', 'ASC')
        .take(limit)
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .getMany();
      const claimed: ClaimedParserSchedule[] = [];
      for (const schedule of due) {
        if (!schedule.next_run_at) {
          continue;
        }
        const plannedRunAt = new Date(schedule.next_run_at);
        schedule.next_run_at = this.computeNextRunAtByPreset({
          frequencyPreset: schedule.frequency_preset,
          cronExpression: schedule.cron_expression,
          timezone: schedule.timezone,
          from: plannedRunAt,
          minAfter: now,
        });
        claimed.push({
          schedule,
          plannedRunAt,
        });
      }
      if (claimed.length > 0) {
        await repo.save(claimed.map((item) => item.schedule));
      }
      return claimed;
    });
  }

  async findSchedulesNeedingAvailabilityRefresh(
    before: Date,
    limit: number,
  ): Promise<ParserSchedule[]> {
    return this.scheduleRepo
      .createQueryBuilder('s')
      .where('s.deleted_at IS NULL')
      .andWhere('s.status = :st', { st: 'active' })
      .andWhere(
        '(s.resource_availability_checked_at IS NULL OR s.resource_availability_checked_at < :before)',
        {
          before,
        },
      )
      .orderBy('s.resource_availability_checked_at', 'ASC', 'NULLS FIRST')
      .take(limit)
      .getMany();
  }

  private reconcileListedSiteAvailability(rows: ParserSchedule[]): void {
    const groups = new Map<string, ParserSchedule[]>();
    for (const row of rows) {
      const key = `${row.parser_code}\0${row.target_env}`;
      const group = groups.get(key);
      if (group) {
        group.push(row);
      } else {
        groups.set(key, [row]);
      }
    }
    for (const group of groups.values()) {
      if (group.length < 2) {
        continue;
      }
      const withCheck = group
        .filter((row) => row.resource_availability_checked_at != null)
        .sort(
          (a, b) =>
            (b.resource_availability_checked_at?.getTime() ?? 0) -
            (a.resource_availability_checked_at?.getTime() ?? 0),
        );
      if (withCheck.length === 0) {
        this.scheduleAvailabilityRefresh(group[0].id);
        continue;
      }
      const canonical = withCheck[0];
      const inconsistent = group.some(
        (row) => row.resource_availability_status !== canonical.resource_availability_status,
      );
      for (const row of group) {
        row.resource_availability_status = canonical.resource_availability_status;
        row.resource_availability_summary = canonical.resource_availability_summary;
        row.resource_availability_checked_at = canonical.resource_availability_checked_at;
        row.resource_availability_scope = canonical.resource_availability_scope;
      }
      if (inconsistent) {
        this.scheduleAvailabilityRefresh(canonical.id);
      }
    }
  }

  private async assertPlpScheduleFileRules(params: {
    parserCode: string;
    targetEnv: ParserTargetEnv;
    parserPlpMode: 'mono' | 'multi';
    plpFileKey: string;
    excludeScheduleId?: string;
  }): Promise<void> {
    const existingSchedules = await this.scheduleRepo.find({
      where: {
        parser_code: params.parserCode,
        run_type: 'plp',
        status: 'active',
        target_env: params.targetEnv,
        deleted_at: IsNull(),
      },
    });
    const existingKeys = existingSchedules
      .filter((schedule) => schedule.id !== params.excludeScheduleId)
      .map((schedule) =>
        this.plpFileService.resolvePlpOutputFileKey(params.parserCode, schedule.config_snapshot),
      );

    if (params.parserPlpMode === 'mono') {
      if (existingKeys.some((key) => key !== params.plpFileKey)) {
        throw new BadRequestException('errors.parsingPlpModeMonoSingleFileOnly');
      }
      return;
    }

    if (existingKeys.includes(params.plpFileKey)) {
      throw new BadRequestException('errors.parsingPlpFileNameAlreadyUsed');
    }
  }

  private async logScheduleAudit(
    actorUserId: string,
    action: AuditAction,
    entityId: string,
    before: Record<string, unknown> | null,
    after: Record<string, unknown> | null,
    ip?: string,
    userAgent?: string,
  ): Promise<void> {
    const entityType: AuditEntityType = 'PARSER_SCHEDULE';
    await this.adminAudit.log(this.scheduleRepo.manager, {
      actorUserId,
      action,
      entityType,
      entityId,
      before,
      after,
      ip,
      userAgent,
    });
  }

  private computeNextRunAtByPreset(params: {
    frequencyPreset?: string | null;
    cronExpression: string;
    timezone: string;
    from: Date;
    minAfter?: Date;
    everyNDays?: number;
  }): Date {
    if (params.frequencyPreset === 'every_n_days') {
      const parsedEveryNDays =
        params.everyNDays ?? parseEveryNDaysFromCronExpression(params.cronExpression);
      if (!parsedEveryNDays) {
        throw new Error('Invalid every_n_days interval');
      }
      if (params.minAfter) {
        return computeNextRunAtFromCronAfter({
          cronExpression: params.cronExpression,
          timezone: params.timezone,
          from: params.from,
          minAfter: params.minAfter,
        });
      }
      return computeNextRunAtFromCron({
        cronExpression: params.cronExpression,
        timezone: params.timezone,
        from: params.from,
      });
    }
    if (params.minAfter) {
      return computeNextRunAtFromCronAfter({
        cronExpression: params.cronExpression,
        timezone: params.timezone,
        from: params.from,
        minAfter: params.minAfter,
      });
    }
    return computeNextRunAtFromCron({
      cronExpression: params.cronExpression,
      timezone: params.timezone,
      from: params.from,
    });
  }
}
