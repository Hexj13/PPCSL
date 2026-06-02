import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import type { Queue } from 'bullmq';

import {
  COVER_BLURHASH_JOB,
  CoverBlurhashJobPayload,
  UPLOAD_PROCESSING_QUEUE,
} from './upload-queue.processor';

@Injectable()
export class UploadQueueProducer {
  private readonly logger = new Logger(UploadQueueProducer.name);

  constructor(
    @InjectQueue(UPLOAD_PROCESSING_QUEUE)
    private readonly queue: Queue<CoverBlurhashJobPayload>,
  ) {}

  async enqueueCoverBlurhash(listingId: string): Promise<void> {
    await this.queue.add(
      COVER_BLURHASH_JOB,
      { listingId },
      {
        jobId: `cover-blurhash:${listingId}`,
        removeOnComplete: true,
        removeOnFail: 100,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );
  }
}
