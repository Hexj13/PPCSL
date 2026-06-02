import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';

import { AdminAuditService } from '../../admin/admin-audit.service';
import { AdminUsersService } from '../../admin/admin-users.service';
import { CliParserRunnerService } from '../infrastructure/cli-parser-runner.service';
import { ParserLogChunk } from '../infrastructure/persistence/parser-log-chunk.entity';
import { ParserRun } from '../infrastructure/persistence/parser-run.entity';
import { ParserSchedule } from '../infrastructure/persistence/parser-schedule.entity';
import { PlpStorageService } from '../infrastructure/plp-storage.service';

import { ParserPlpFileService } from './parser-plp-file.service';
import { ParserRunLogWriter } from './parser-run-log-writer.service';
import { ParsingOrchestratorService } from './parsing-orchestrator.service';
import { ParsingPdpRunExecutor } from './parsing-pdp-run-executor.service';
import { ParsingPlpRunExecutor } from './parsing-plp-run-executor.service';
import { ParsingRunChildProcessHost } from './parsing-run-child-process.host';
import { ParsingRunLifecycleService } from './parsing-run-lifecycle.service';
import { ParsingSyncRunExecutor } from './parsing-sync-run-executor.service';

function createParserRun(overrides: Partial<ParserRun> = {}): ParserRun {
  return {
    id: 'run-default',
    parser_code: 'cipauto',
    run_type: 'plp',
    domain: 'example.com',
    assigned_user_id: null,
    assigned_user: null,
    target_env: 'local',
    trigger_mode: 'manual',
    schedule_id: null,
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
    process_pid: null,
    created_at: new Date('2026-01-01T10:00:00.000Z'),
    updated_at: new Date('2026-01-01T10:00:00.000Z'),
    ...overrides,
  } as ParserRun;
}

describe('ParsingOrchestratorService', () => {
  const createService = () => {
    const runRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      createQueryBuilder: jest.fn(),
      update: jest.fn(),
      manager: {},
    } as unknown as Repository<ParserRun>;
    const logChunkRepo = {} as unknown as Repository<ParserLogChunk>;
    const scheduleRepo = {} as unknown as Repository<ParserSchedule>;
    const cliRunner = {} as unknown as CliParserRunnerService;
    const plpStorage = {} as unknown as PlpStorageService;
    const adminAudit = {
      log: jest.fn().mockResolvedValue(undefined),
    } as unknown as AdminAuditService;
    const adminService = {} as unknown as AdminUsersService;
    const runLogWriter = {
      append: jest.fn().mockResolvedValue(undefined),
      flush: jest.fn().mockResolvedValue(undefined),
      cleanup: jest.fn(),
    } as unknown as ParserRunLogWriter;
    const plpFileService = {} as unknown as ParserPlpFileService;
    const runLifecycle = {
      getRun: jest.fn(async (id: string) => {
        const run = await (runRepo.findOne as jest.Mock)({ where: { id } });
        if (!run) {
          throw new NotFoundException('errors.parserRunNotFound');
        }
        return run;
      }),
      failRun: jest.fn().mockResolvedValue(undefined),
    } as unknown as ParsingRunLifecycleService;
    const childHost = {
      getActive: jest.fn().mockReturnValue(undefined),
      setKillTimer: jest.fn(),
    } as unknown as ParsingRunChildProcessHost;
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
    return { service, runRepo, adminAudit };
  };

  describe('reconcileStaleActiveRunsOnStartup', () => {
    it('does not mark queued runs as failed', async () => {
      const { service, runRepo } = createService();
      const queued = createParserRun({ id: 'queued-1', status: 'queued' });
      (runRepo.find as jest.Mock).mockResolvedValueOnce([]).mockResolvedValueOnce([queued]);

      const scheduleSpy = jest
        .spyOn(
          service as unknown as { scheduleTryStartNextQueuedRun: () => void },
          'scheduleTryStartNextQueuedRun',
        )
        .mockImplementation(() => undefined);

      await service.reconcileStaleActiveRunsOnStartup();

      expect(runRepo.save).not.toHaveBeenCalled();
      expect(queued.status).toBe('queued');
      expect(scheduleSpy).toHaveBeenCalledWith('cipauto', 'plp', 'local');
      scheduleSpy.mockRestore();
    });

    it('marks in_progress and cancel_requested runs as failed and kicks queued buckets', async () => {
      const { service, runRepo } = createService();
      const stale = createParserRun({ id: 'stale-1', status: 'in_progress' });
      const queued = createParserRun({
        id: 'queued-1',
        status: 'queued',
        parser_code: '999md',
        run_type: 'pdp',
      });
      (runRepo.find as jest.Mock).mockResolvedValueOnce([stale]).mockResolvedValueOnce([queued]);
      (runRepo.save as jest.Mock).mockResolvedValue(undefined);

      const scheduleSpy = jest
        .spyOn(
          service as unknown as { scheduleTryStartNextQueuedRun: () => void },
          'scheduleTryStartNextQueuedRun',
        )
        .mockImplementation(() => undefined);

      const count = await service.reconcileStaleActiveRunsOnStartup();

      expect(count).toBe(1);
      expect(stale.status).toBe('failed');
      expect(stale.finished_at).toBeInstanceOf(Date);
      expect(runRepo.save).toHaveBeenCalledTimes(1);
      expect(scheduleSpy).toHaveBeenCalledWith('999md', 'pdp', 'local');
      scheduleSpy.mockRestore();
    });

    it('deduplicates scheduleTryStartNextQueuedRun calls for the same bucket', async () => {
      const { service, runRepo } = createService();
      (runRepo.find as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          createParserRun({ id: 'q1', status: 'queued' }),
          createParserRun({ id: 'q2', status: 'queued' }),
        ]);

      const scheduleSpy = jest
        .spyOn(
          service as unknown as { scheduleTryStartNextQueuedRun: () => void },
          'scheduleTryStartNextQueuedRun',
        )
        .mockImplementation(() => undefined);

      await service.reconcileStaleActiveRunsOnStartup();

      expect(scheduleSpy).toHaveBeenCalledTimes(1);
      expect(scheduleSpy).toHaveBeenCalledWith('cipauto', 'plp', 'local');
      scheduleSpy.mockRestore();
    });
  });

  describe('requestCancelRun', () => {
    it('schedules the next queued run after cancelling a queued run that never started', async () => {
      const { service, runRepo } = createService();
      const run = createParserRun({
        id: 'queued-cancel',
        status: 'queued',
        parser_code: 'cipauto',
        run_type: 'plp',
        target_env: 'local',
      });
      (runRepo.findOne as jest.Mock).mockResolvedValue(run);
      (runRepo.save as jest.Mock).mockImplementation(async (value: ParserRun) => value);

      const scheduleSpy = jest
        .spyOn(
          service as unknown as { scheduleTryStartNextQueuedRun: () => void },
          'scheduleTryStartNextQueuedRun',
        )
        .mockImplementation(() => undefined);

      const result = await service.requestCancelRun(run.id, 'admin-1');

      expect(result.status).toBe('cancelled');
      expect(scheduleSpy).toHaveBeenCalledWith('cipauto', 'plp', 'local');
      scheduleSpy.mockRestore();
    });

    it('does not schedule try-start when cancelling an in-progress run', async () => {
      const { service, runRepo } = createService();
      const run = createParserRun({
        id: 'ip-1',
        status: 'in_progress',
        parser_code: 'cipauto',
        run_type: 'plp',
      });
      (runRepo.findOne as jest.Mock).mockResolvedValue(run);
      (runRepo.save as jest.Mock).mockImplementation(async (value: ParserRun) => value);

      const scheduleSpy = jest
        .spyOn(
          service as unknown as { scheduleTryStartNextQueuedRun: () => void },
          'scheduleTryStartNextQueuedRun',
        )
        .mockImplementation(() => undefined);

      await service.requestCancelRun(run.id, 'admin-1');

      expect(scheduleSpy).not.toHaveBeenCalled();
      scheduleSpy.mockRestore();
    });

    it('throws when run is not cancellable', async () => {
      const { service, runRepo } = createService();
      (runRepo.findOne as jest.Mock).mockResolvedValue(
        createParserRun({ id: 'done-1', status: 'completed' }),
      );

      await expect(service.requestCancelRun('done-1', 'admin-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });
});
