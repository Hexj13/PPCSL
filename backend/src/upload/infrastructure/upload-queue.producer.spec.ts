import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';

import { UploadQueueProducer } from './upload-queue.producer';
import { COVER_BLURHASH_JOB, UPLOAD_PROCESSING_QUEUE } from './upload-queue.processor';

describe('UploadQueueProducer', () => {
  let producer: UploadQueueProducer;
  let queue: { add: jest.Mock };

  beforeEach(async () => {
    queue = { add: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadQueueProducer,
        { provide: getQueueToken(UPLOAD_PROCESSING_QUEUE), useValue: queue },
      ],
    }).compile();

    producer = module.get(UploadQueueProducer);
  });

  it('enqueues a deduplicated cover blurhash job with retry options', async () => {
    await producer.enqueueCoverBlurhash('listing-1');

    expect(queue.add).toHaveBeenCalledWith(
      COVER_BLURHASH_JOB,
      { listingId: 'listing-1' },
      expect.objectContaining({
        jobId: 'cover-blurhash:listing-1',
        attempts: 3,
      }),
    );
  });
});
