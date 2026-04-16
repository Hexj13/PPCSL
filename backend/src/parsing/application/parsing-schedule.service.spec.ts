import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';

import { AdminAuditService } from '../../admin/admin-audit.service';
import { AdminUsersService } from '../../admin/admin-users.service';
import { ParserSchedule } from '../infrastructure/persistence/parser-schedule.entity';

import { ParsingAvailabilityService } from './parsing-availability.service';
import { ParsingOrchestratorService } from './parsing-orchestrator.service';
import { ParsingScheduleService } from './parsing-schedule.service';

function createSchedule(overrides: Partial<ParserSchedule> = {}): ParserSchedule {
  return {
    id: 'schedule-1',
    parser_code: 'cipauto',
    run_type: 'plp',
    domain: 'example.com',
    assigned_user_id: null,
    assigned_user: null,
    target_env: 'local',
    cron_expression: '0 3 * * *',
    frequency_preset: 'daily',
    timezone: 'Europe/Chisinau',
    status: 'active',
    config_snapshot: { scanMode: 'first_n', pages: 1 },
    next_run_at: new Date('2026-04-15T03:00:00.000Z'),
    last_run_at: null,
    resource_availability_status: null,
    resource_availability_checked_at: null,
    resource_availability_summary: null,
    resource_availability_scope: null,
    created_by_admin_user_id: 'admin-1',
    created_by_admin: null as never,
    updated_by_admin_user_id: null,
    updated_by_admin: null,
    deleted_at: null,
    created_at: new Date('2026-04-14T10:00:00.000Z'),
    updated_at: new Date('2026-04-14T10:00:00.000Z'),
    ...overrides,
  } as ParserSchedule;
}

describe('ParsingScheduleService', () => {
  const createDeps = () => {
    const claimedRepo = {
      createQueryBuilder: jest.fn(),
      save: jest.fn(),
    };
    const manager = {} as {
      getRepository: jest.Mock;
      transaction: jest.Mock;
    };
    manager.getRepository = jest.fn().mockReturnValue(claimedRepo);
    manager.transaction = jest.fn(async (callback: (innerManager: unknown) => Promise<unknown>) =>
      callback(manager),
    );
    const scheduleRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      manager,
    } as unknown as Repository<ParserSchedule>;
    const adminAudit = {
      log: jest.fn().mockResolvedValue(undefined),
    } as unknown as AdminAuditService;
    const adminService = {} as AdminUsersService;
    const orchestrator = {
      createRunFromSchedule: jest.fn(),
    } as unknown as ParsingOrchestratorService;
    const availability = {
      probeCatalogPages: jest.fn().mockResolvedValue({ ok: 1, total: 1, summary: 'ok' }),
      getDefaultCatalogPageProbeCount: jest.fn(),
      probeParserSource: jest.fn().mockResolvedValue({ ok: 1, total: 1, summary: 'ok' }),
    } as unknown as ParsingAvailabilityService;

    const service = new ParsingScheduleService(
      scheduleRepo,
      adminAudit,
      adminService,
      orchestrator,
      availability,
    );

    return { service, scheduleRepo, orchestrator, manager, claimedRepo };
  };

  it('deactivates schedule without deleting it', async () => {
    const { service, scheduleRepo } = createDeps();
    const schedule = createSchedule({ status: 'active' });
    (scheduleRepo.findOne as jest.Mock).mockResolvedValue(schedule);
    (scheduleRepo.save as jest.Mock).mockImplementation(async (value: ParserSchedule) => value);

    const result = await service.setScheduleStatus({
      id: schedule.id,
      adminUserId: 'admin-2',
      status: 'deactivated',
    });

    expect(result.status).toBe('deactivated');
    expect(result.deleted_at).toBeNull();
    expect(result.next_run_at).toBeNull();
  });

  it('reactivates schedule and recalculates next run', async () => {
    const { service, scheduleRepo } = createDeps();
    const schedule = createSchedule({ status: 'deactivated', next_run_at: null });
    (scheduleRepo.findOne as jest.Mock).mockResolvedValue(schedule);
    (scheduleRepo.save as jest.Mock).mockImplementation(async (value: ParserSchedule) => value);

    const result = await service.setScheduleStatus({
      id: schedule.id,
      adminUserId: 'admin-2',
      status: 'active',
    });

    expect(result.status).toBe('active');
    expect(result.next_run_at).toBeInstanceOf(Date);
  });

  it('soft-deletes schedule and hides it from getSchedule', async () => {
    const { service, scheduleRepo } = createDeps();
    const schedule = createSchedule();
    (scheduleRepo.findOne as jest.Mock).mockResolvedValueOnce(schedule).mockResolvedValueOnce(null);
    (scheduleRepo.save as jest.Mock).mockImplementation(async (value: ParserSchedule) => value);

    await service.softDeleteSchedule({
      id: schedule.id,
      adminUserId: 'admin-2',
    });

    await expect(service.getSchedule(schedule.id)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('runScheduleNow creates run and returns run id', async () => {
    const { service, scheduleRepo, orchestrator } = createDeps();
    const schedule = createSchedule({ status: 'deactivated' });
    (scheduleRepo.findOne as jest.Mock)
      .mockResolvedValueOnce(schedule)
      .mockResolvedValueOnce(schedule);
    (scheduleRepo.save as jest.Mock).mockImplementation(async (value: ParserSchedule) => value);
    (orchestrator.createRunFromSchedule as jest.Mock).mockResolvedValue({ id: 'run-1' });

    const result = await service.runScheduleNow({
      id: schedule.id,
      adminUserId: 'admin-2',
    });

    expect(orchestrator.createRunFromSchedule).toHaveBeenCalledWith(schedule);
    expect(result).toEqual({ runId: 'run-1' });
  });

  it('claims overdue schedule once and moves next run to future slot', async () => {
    const { service, claimedRepo } = createDeps();
    const now = new Date('2026-04-15T10:35:00.000Z');
    const dueSchedule = createSchedule({
      cron_expression: '*/10 * * * *',
      next_run_at: new Date('2026-04-15T08:00:00.000Z'),
    });
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      setOnLocked: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([dueSchedule]),
    };
    (claimedRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);
    (claimedRepo.save as jest.Mock).mockResolvedValue([dueSchedule]);

    const claimed = await service.claimDueSchedules(now, 10);

    expect(claimed).toHaveLength(1);
    expect(claimed[0].plannedRunAt.toISOString()).toBe('2026-04-15T08:00:00.000Z');
    expect(claimed[0].schedule.next_run_at?.toISOString()).toBe('2026-04-15T10:40:00.000Z');
    expect(claimedRepo.save).toHaveBeenCalledTimes(1);
  });
});
