import { Repository } from 'typeorm';

import { AdminAuditService } from '../../admin/admin-audit.service';
import { AdminUsersService } from '../../admin/admin-users.service';
import { CliParserRunnerService } from '../infrastructure/cli-parser-runner.service';
import { PlpStorageService } from '../infrastructure/plp-storage.service';
import { ParserLogChunk } from '../infrastructure/persistence/parser-log-chunk.entity';
import { ParserRun } from '../infrastructure/persistence/parser-run.entity';
import { ParserSchedule } from '../infrastructure/persistence/parser-schedule.entity';

import { ParserPlpFileService } from './parser-plp-file.service';
import { ParserRunLogWriter } from './parser-run-log-writer.service';
import { ParsingOrchestratorService } from './parsing-orchestrator.service';
import { ParsingPdpRunExecutor } from './parsing-pdp-run-executor.service';
import { ParsingPlpRunExecutor } from './parsing-plp-run-executor.service';
import { ParsingRunChildProcessHost } from './parsing-run-child-process.host';
import { ParsingRunLifecycleService } from './parsing-run-lifecycle.service';
import { ParsingSyncRunExecutor } from './parsing-sync-run-executor.service';

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
  it('marks stale in_progress and cancel_requested runs as failed on startup without failing queued rows', async () => {
    const runRepo = {
      find: jest.fn(),
      save: jest.fn(),
    } as unknown as Repository<ParserRun>;
    const logChunkRepo = {} as Repository<ParserLogChunk>;
    const scheduleRepo = {} as Repository<ParserSchedule>;
    const cliRunner = {} as CliParserRunnerService;
    const plpStorage = { useS3: false } as PlpStorageService;
    const adminAudit = {} as AdminAuditService;
    const adminService = {} as AdminUsersService;
    const runLogWriter = {
      append: jest.fn().mockResolvedValue(undefined),
      flush: jest.fn().mockResolvedValue(undefined),
      cleanup: jest.fn(),
    } as unknown as ParserRunLogWriter;
    const plpFileService = {} as unknown as ParserPlpFileService;
    const runLifecycle = {} as ParsingRunLifecycleService;
    const childHost = {} as ParsingRunChildProcessHost;
    const plpRunExecutor = { run: jest.fn() } as unknown as ParsingPlpRunExecutor;
    const pdpRunExecutor = { run: jest.fn() } as unknown as ParsingPdpRunExecutor;
    const syncRunExecutor = { run: jest.fn() } as unknown as ParsingSyncRunExecutor;
    const service = new ParsingOrchestratorService(
      runRepo,
      logChunkRepo,
      scheduleRepo,
      cliRunner,
      plpStorage,
      adminAudit,
      adminService,
      runLogWriter,
      plpFileService,
      runLifecycle,
      childHost,
      plpRunExecutor,
      pdpRunExecutor,
      syncRunExecutor,
    );
    const staleRuns = [
      createRun({ id: 'run-1', status: 'in_progress', counters: { old: true } }),
      createRun({ id: 'run-2', status: 'cancel_requested' }),
    ];
    (runRepo.find as jest.Mock).mockResolvedValueOnce(staleRuns).mockResolvedValueOnce([]);
    (runRepo.save as jest.Mock).mockResolvedValue(staleRuns);

    const scheduleSpy = jest
      .spyOn(
        service as unknown as { scheduleTryStartNextQueuedRun: () => void },
        'scheduleTryStartNextQueuedRun',
      )
      .mockImplementation(() => undefined);

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
    expect(scheduleSpy).not.toHaveBeenCalled();
    scheduleSpy.mockRestore();
  });
});
