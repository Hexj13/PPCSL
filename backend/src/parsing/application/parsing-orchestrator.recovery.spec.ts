import { Repository } from 'typeorm';

import { AdminAuditService } from '../../admin/admin-audit.service';
import { AdminService } from '../../admin/admin.service';
import { CliParserRunnerService } from '../infrastructure/cli-parser-runner.service';
import { ParserLogChunk } from '../infrastructure/persistence/parser-log-chunk.entity';
import { ParserRun } from '../infrastructure/persistence/parser-run.entity';
import { ParserSchedule } from '../infrastructure/persistence/parser-schedule.entity';

import { ParsingOrchestratorService } from './parsing-orchestrator.service';

function createRun(overrides: Partial<ParserRun> = {}): ParserRun {
  return {
    id: 'run-1',
    parser_code: 'cipauto',
    run_type: 'plp',
    domain: 'example.com',
    assigned_user_id: null,
    assigned_user: null,
    target_env: 'local',
    trigger_mode: 'scheduled',
    schedule_id: 'schedule-1',
    schedule: null,
    status: 'queued',
    config_snapshot: {},
    started_at: null,
    finished_at: null,
    cancel_requested_at: null,
    created_by_admin_user_id: 'admin-1',
    created_by_admin: null as never,
    log_storage_key: null,
    report_storage_key: null,
    counters: null,
    source_status_summary: null,
    error_summary: null,
    process_pid: 12345,
    created_at: new Date('2026-04-15T08:00:00.000Z'),
    updated_at: new Date('2026-04-15T08:00:00.000Z'),
    ...overrides,
  };
}

describe('ParsingOrchestratorService recovery', () => {
  it('marks stale active runs as failed on startup', async () => {
    const runRepo = {
      find: jest.fn(),
      save: jest.fn(),
    } as unknown as Repository<ParserRun>;
    const logChunkRepo = {} as Repository<ParserLogChunk>;
    const scheduleRepo = {} as Repository<ParserSchedule>;
    const cliRunner = {} as CliParserRunnerService;
    const adminAudit = {} as AdminAuditService;
    const adminService = {} as AdminService;
    const service = new ParsingOrchestratorService(
      runRepo,
      logChunkRepo,
      scheduleRepo,
      cliRunner,
      adminAudit,
      adminService,
    );
    const staleRuns = [
      createRun({ id: 'run-1', status: 'queued', counters: { old: true } }),
      createRun({ id: 'run-2', status: 'in_progress' }),
    ];
    (runRepo.find as jest.Mock).mockResolvedValue(staleRuns);
    (runRepo.save as jest.Mock).mockResolvedValue(staleRuns);

    const recovered = await service.reconcileStaleActiveRunsOnStartup();

    expect(recovered).toBe(2);
    expect(runRepo.save).toHaveBeenCalledTimes(1);
    const savedRuns = (runRepo.save as jest.Mock).mock.calls[0][0] as ParserRun[];
    expect(savedRuns[0].status).toBe('failed');
    expect(savedRuns[1].status).toBe('failed');
    expect(savedRuns[0].process_pid).toBeNull();
    expect(savedRuns[1].process_pid).toBeNull();
    expect(savedRuns[0].counters).toEqual({ old: true, exitCode: 1, restartRecovered: true });
    expect(savedRuns[1].counters).toEqual({ exitCode: 1, restartRecovered: true });
  });
});
