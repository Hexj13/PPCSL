import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Job } from 'bullmq';
import { Repository } from 'typeorm';

import { Listing } from '../../listings/entities/listing.entity';
import {
  encodeBlurhashFromBuffer,
  fetchImageBufferFromS3,
  getS3ClientForBackfill,
} from '../../scripts/tools/backfill-blurhash-utils';

export const UPLOAD_PROCESSING_QUEUE = 'upload-processing';
export const COVER_BLURHASH_JOB = 'cover-blurhash';

export interface CoverBlurhashJobPayload {
  listingId: string;
}

@Processor(UPLOAD_PROCESSING_QUEUE)
export class UploadQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(UploadQueueProcessor.name);

  constructor(
    @InjectRepository(Listing)
    private readonly listingsRepository: Repository<Listing>,
  ) {
    super();
  }

  async process(job: Job<CoverBlurhashJobPayload>): Promise<void> {
    if (job.name !== COVER_BLURHASH_JOB) {
      this.logger.warn(`Unknown upload job: ${job.name}`);
      return;
    }
    await this.processCoverBlurhash(job.data.listingId);
  }

  private async processCoverBlurhash(listingId: string): Promise<void> {
    const listing = await this.listingsRepository.findOne({
      where: { id: listingId },
      select: ['id', 'images', 'cover_blur_hash'],
    });
    if (!listing || !listing.images?.length || listing.cover_blur_hash) {
      return;
    }

    const s3 = getS3ClientForBackfill();
    const bucket = process.env.AWS_S3_BUCKET_NAME || 'kupito-uploads';
    if (!s3) {
      this.logger.warn('S3 not configured; skipping cover blurhash job');
      return;
    }

    const buffer = await fetchImageBufferFromS3(listing.images[0], s3, bucket);
    if (!buffer) {
      return;
    }

    const hash = await encodeBlurhashFromBuffer(buffer);
    if (!hash) {
      return;
    }

    await this.listingsRepository.update({ id: listingId }, { cover_blur_hash: hash });
    this.logger.log(`Computed cover blurhash for listing ${listingId}`);
  }
}
