import { ParsingOrchestratorService } from './parsing-orchestrator.service';
import { ParsingScheduleCronService } from './parsing-schedule-cron.service';
import type { ClaimedParserSchedule } from './parsing-schedule.service';
import { ParsingScheduleService } from './parsing-schedule.service';
import { QueryFailedError } from 'typeorm';

describe('ParsingScheduleCronService', () => {
  const createDeps = () => {
    const schedules = {
      claimDueSchedules: jest.fn(),
      findSchedulesNeedingAvailabilityRefresh: jest.fn(),
      refreshScheduleAvailability: jest.fn(),
    } as unknown as ParsingScheduleService;
    const orchestrator = {
      createRunFromSchedule: jest.fn(),
      reconcileStaleActiveRunsOnStartup: jest.fn().mockResolvedValue(0),
    } as unknown as ParsingOrchestratorService;
    const service = new ParsingScheduleCronService(schedules, orchestrator);
    return { service, schedules, orchestrator };
  };

  it('uses claimed schedules with planned run timestamp', async () => {
    const { service, schedules, orchestrator } = createDeps();
    const plannedRunAt = new Date('2026-04-15T10:00:00.000Z');
    const claimed: ClaimedParserSchedule[] = [
      {
        plannedRunAt,
        schedule: {
          id: 'schedule-1',
          parser_code: 'cipauto',
          run_type: 'plp',
          domain: 'example.com',
          assigned_user_id: null,
          assigned_user: null,
          target_env: 'local',
          cron_expression: '0 * * * *',
          frequency_preset: 'hourly',
          timezone: 'Europe/Chisinau',
          status: 'active',
          config_snapshot: {},
          next_run_at: new Date('2026-04-15T11:00:00.000Z'),
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
          created_at: new Date('2026-04-15T09:00:00.000Z'),
          updated_at: new Date('2026-04-15T09:00:00.000Z'),
        },
      },
    ];
    (schedules.claimDueSchedules as jest.Mock).mockResolvedValue(claimed);
    (orchestrator.createRunFromSchedule as jest.Mock).mockResolvedValue({ id: 'run-1' });

    await service.runDueSchedules();

    expect(schedules.claimDueSchedules).toHaveBeenCalledTimes(1);
    expect(orchestrator.createRunFromSchedule).toHaveBeenCalledWith(
      claimed[0].schedule,
      plannedRunAt,
    );
  });

  it('reconciles stale runs on startup', async () => {
    const { service, orchestrator } = createDeps();
    (orchestrator.reconcileStaleActiveRunsOnStartup as jest.Mock).mockResolvedValue(2);

    await service.onApplicationBootstrap();

    expect(orchestrator.reconcileStaleActiveRunsOnStartup).toHaveBeenCalledTimes(1);
  });

  it('skips startup reconcile when parsing tables are missing', async () => {
    const { service, orchestrator } = createDeps();
    const driverError = Object.assign(new Error('relation "parser_runs" does not exist'), {
      code: '42P01',
    });
    const missingTableError = new QueryFailedError('SELECT * FROM "parser_runs"', [], driverError);
    (orchestrator.reconcileStaleActiveRunsOnStartup as jest.Mock).mockRejectedValue(
      missingTableError,
    );

    await expect(service.onApplicationBootstrap()).resolves.toBeUndefined();
    expect(orchestrator.reconcileStaleActiveRunsOnStartup).toHaveBeenCalledTimes(1);
  });
});
