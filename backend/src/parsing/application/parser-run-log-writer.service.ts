import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { stripAnsiSequences } from '../../common/utils/strip-ansi-sequences';
import { ParserLogChunk } from '../infrastructure/persistence/parser-log-chunk.entity';

@Injectable()
export class ParserRunLogWriter {
  private static readonly LOG_BUFFER_SIZE = 50;
  private static readonly LOG_FLUSH_DELAY_MS = 250;

  private readonly logger = new Logger(ParserRunLogWriter.name);
  private readonly logSeq = new Map<string, number>();
  private readonly logBuffers = new Map<string, ParserLogChunk[]>();
  private readonly logFlushTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly logFlushChains = new Map<string, Promise<void>>();

  constructor(
    @InjectRepository(ParserLogChunk)
    private readonly logChunkRepo: Repository<ParserLogChunk>,
  ) {}

  async append(runId: string, level: string, message: string, rawLine: string): Promise<void> {
    const sanitizedMessage = stripAnsiSequences(message).replace(/\r\n/g, '\n').trimEnd();
    const sanitizedRaw = stripAnsiSequences(rawLine).replace(/\r\n/g, '\n').trimEnd();
    const consoleLine = `[RUN][${runId}][${level}] ${sanitizedMessage}`;
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
      message: sanitizedMessage.slice(0, 8000),
      raw_line: sanitizedRaw.slice(0, 8000),
    });
    const buffer = this.logBuffers.get(runId) ?? [];
    buffer.push(chunk);
    this.logBuffers.set(runId, buffer);

    if (buffer.length >= ParserRunLogWriter.LOG_BUFFER_SIZE) {
      await this.flush(runId);
      return;
    }

    if (!this.logFlushTimers.has(runId)) {
      const timer = setTimeout(() => {
        this.logFlushTimers.delete(runId);
        void this.flush(runId);
      }, ParserRunLogWriter.LOG_FLUSH_DELAY_MS);
      this.logFlushTimers.set(runId, timer);
    }
  }

  async flush(runId: string): Promise<void> {
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

  cleanup(runId: string): void {
    const timer = this.logFlushTimers.get(runId);
    if (timer) {
      clearTimeout(timer);
      this.logFlushTimers.delete(runId);
    }
    this.logBuffers.delete(runId);
    this.logFlushChains.delete(runId);
    this.logSeq.delete(runId);
  }
}
