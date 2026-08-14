import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { ParserLogChunk } from '../infrastructure/persistence/parser-log-chunk.entity';

import {
  isParserRunLogRetentionExpired,
  PARSER_LOG_RETENTION_DAYS,
  ParserRunRetentionService,
} from './parser-run-retention.service';

jest.mock('@sentry/node', () => ({
  withMonitor: jest.fn((_name: string, fn: () => Promise<unknown>) => fn()),
}));

describe('ParserRunRetentionService', () => {
  let service: ParserRunRetentionService;
  let logChunkRepo: { query: jest.Mock; delete: jest.Mock };

  beforeEach(async () => {
    logChunkRepo = {
      query: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParserRunRetentionService,
        { provide: getRepositoryToken(ParserLogChunk), useValue: logChunkRepo },
      ],
    }).compile();

    service = module.get(ParserRunRetentionService);
  });

  it('deletes expired log chunks in batches until none remain', async () => {
    logChunkRepo.query.mockResolvedValueOnce([{ id: 'c1' }, { id: 'c2' }]);
    logChunkRepo.delete.mockResolvedValue({ affected: 2 });

    const result = await service.cleanupExpiredLogChunks();

    expect(logChunkRepo.query).toHaveBeenCalledTimes(1);
    expect(logChunkRepo.delete).toHaveBeenCalledWith(['c1', 'c2']);
    expect(result.deleted).toBe(2);
  });

  it('returns zero when there are no expired chunks', async () => {
    logChunkRepo.query.mockResolvedValueOnce([]);

    const result = await service.cleanupExpiredLogChunks();

    expect(logChunkRepo.delete).not.toHaveBeenCalled();
    expect(result.deleted).toBe(0);
  });
});

describe('isParserRunLogRetentionExpired', () => {
  const now = Date.parse('2026-08-14T12:00:00.000Z');

  it('is false when log chunks still exist', () => {
    expect(
      isParserRunLogRetentionExpired(
        {
          status: 'completed',
          finished_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
        3,
        now,
      ),
    ).toBe(false);
  });

  it('is false for active runs without chunks', () => {
    expect(
      isParserRunLogRetentionExpired(
        {
          status: 'in_progress',
          finished_at: null,
          updated_at: '2026-01-01T00:00:00.000Z',
        },
        0,
        now,
      ),
    ).toBe(false);
  });

  it('is true when a finished run is older than the retention window and has no chunks', () => {
    const finishedAt = new Date(now - (PARSER_LOG_RETENTION_DAYS + 1) * 24 * 60 * 60 * 1000);
    expect(
      isParserRunLogRetentionExpired(
        {
          status: 'completed',
          finished_at: finishedAt.toISOString(),
          updated_at: finishedAt.toISOString(),
        },
        0,
        now,
      ),
    ).toBe(true);
  });

  it('is false when a finished run is still inside the retention window', () => {
    const finishedAt = new Date(now - (PARSER_LOG_RETENTION_DAYS - 1) * 24 * 60 * 60 * 1000);
    expect(
      isParserRunLogRetentionExpired(
        {
          status: 'completed',
          finished_at: finishedAt.toISOString(),
          updated_at: finishedAt.toISOString(),
        },
        0,
        now,
      ),
    ).toBe(false);
  });
});
