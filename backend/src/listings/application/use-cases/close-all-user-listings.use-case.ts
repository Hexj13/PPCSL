import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { ListingStatus as ListingStatusEnum } from '../../../common/types';
import { Listing } from '../../entities/listing.entity';
import { ListingVideoService } from '../../video/listing-video.service';
import { ListingAiReportService } from '../listing-ai-report.service';
import { IListingCache, LISTING_CACHE } from '../ports/listing-cache.port';
import { IPromotionHistoryWriter, PROMOTION_HISTORY_WRITER } from '../ports/promotion-history.port';

@Injectable()
export class CloseAllUserListingsUseCase {
  private readonly logger = new Logger(CloseAllUserListingsUseCase.name);

  constructor(
    @InjectRepository(Listing)
    private readonly listingsRepository: Repository<Listing>,
    @Inject(PROMOTION_HISTORY_WRITER)
    private readonly promotionHistoryWriter: IPromotionHistoryWriter,
    @Inject(LISTING_CACHE)
    private readonly listingCache: IListingCache,
    private readonly listingAiReportService: ListingAiReportService,
    private readonly listingVideoService: ListingVideoService,
  ) {}

  async execute(userId: string): Promise<number> {
    const promotedListings = await this.listingsRepository.find({
      where: {
        user_id: userId,
        status: In([ListingStatusEnum.Active, ListingStatusEnum.Paused]),
        is_promoted: true,
      },
      select: ['id'],
    });

    for (const listing of promotedListings) {
      await this.promotionHistoryWriter.updateEndDateForListing(listing.id);
    }

    const candidates = await this.listingsRepository.find({
      where: {
        user_id: userId,
        status: In([ListingStatusEnum.Active, ListingStatusEnum.Paused]),
      },
      select: ['id', 'video'],
    });
    const listingIdsToPurge = candidates.map((l) => l.id);
    const videoSnapshots = candidates
      .filter((row): row is Listing & { video: NonNullable<Listing['video']> } => row.video != null)
      .map((row) => ({ id: row.id, video: row.video }));

    const closedAt = new Date();
    const result = await this.listingsRepository.update(
      {
        user_id: userId,
        status: In([ListingStatusEnum.Active, ListingStatusEnum.Paused]),
      },
      {
        status: ListingStatusEnum.Closed,
        closed_at: closedAt,
        is_promoted: false,
        promoted_until: null,
        promoted_started_at: null,
        promoted_paused_at: null,
        video: null,
      },
    );

    await this.listingAiReportService.deleteByListingIds(listingIdsToPurge);

    for (const snap of videoSnapshots) {
      try {
        await this.listingVideoService.deleteS3ObjectsForVideoJson(snap.video);
      } catch (error) {
        this.logger.warn(
          `purge listing video S3 on bulk close ${snap.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
      try {
        await this.listingCache.invalidateSingle(snap.id);
      } catch (_: unknown) {
        void _;
      }
    }

    try {
      await this.listingCache.invalidateSearch();
    } catch (_: unknown) {
      void _;
    }

    return result.affected || 0;
  }
}
