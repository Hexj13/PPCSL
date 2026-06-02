import { Repository } from 'typeorm';

import { ParserLogChunk } from '../infrastructure/persistence/parser-log-chunk.entity';

import { ParserRunLogWriter } from './parser-run-log-writer.service';

describe('ParserRunLogWriter', () => {
  let writer: ParserRunLogWriter;
  let logChunkRepo: { create: jest.Mock; insert: jest.Mock };

  beforeEach(() => {
    logChunkRepo = {
      create: jest.fn((data: Record<string, unknown>) => data),
      insert: jest.fn().mockResolvedValue(undefined),
    };
    writer = new ParserRunLogWriter(logChunkRepo as unknown as Repository<ParserLogChunk>);
  });

  it('buffers a single line and flushes it explicitly with an incrementing seq', async () => {
    await writer.append('run-1', 'info', 'hello', 'hello');
    expect(logChunkRepo.insert).not.toHaveBeenCalled();

    await writer.flush('run-1');

    expect(logChunkRepo.insert).toHaveBeenCalledTimes(1);
    const inserted = logChunkRepo.insert.mock.calls[0][0] as Array<{
      seq: number;
      message: string;
    }>;
    expect(inserted).toHaveLength(1);
    expect(inserted[0].seq).toBe(1);
    expect(inserted[0].message).toBe('hello');
  });

  it('auto-flushes once the buffer reaches the batch size', async () => {
    for (let i = 0; i < 50; i += 1) {
      await writer.append('run-2', 'info', `line ${i}`, `line ${i}`);
    }

    expect(logChunkRepo.insert).toHaveBeenCalledTimes(1);
    const inserted = logChunkRepo.insert.mock.calls[0][0] as unknown[];
    expect(inserted).toHaveLength(50);
  });

  it('strips ANSI sequences from stored messages', async () => {
    await writer.append('run-3', 'info', '\u001b[31mred\u001b[0m', '\u001b[31mred\u001b[0m');
    await writer.flush('run-3');

    const inserted = logChunkRepo.insert.mock.calls[0][0] as Array<{ message: string }>;
    expect(inserted[0].message).toBe('red');
  });

  it('resets the seq counter after cleanup', async () => {
    await writer.append('run-4', 'info', 'first', 'first');
    await writer.flush('run-4');
    writer.cleanup('run-4');

    await writer.append('run-4', 'info', 'second', 'second');
    await writer.flush('run-4');

    const calls = logChunkRepo.insert.mock.calls;
    const lastInsert = calls[calls.length - 1][0] as Array<{ seq: number }>;
    expect(lastInsert[0].seq).toBe(1);
  });
});
