import { Test, TestingModule } from '@nestjs/testing';

import { Listing } from '../../entities/listing.entity';
import { ListingVideoService } from '../../video/listing-video.service';
import { ListingAiReportService } from '../listing-ai-report.service';
import { LISTING_CACHE } from '../ports/listing-cache.port';
import { LISTING_REPOSITORY } from '../ports/listing.repository.port';
import { PROMOTION_HISTORY_WRITER } from '../ports/promotion-history.port';

import { CloseListingUseCase } from './close-listing.use-case';

describe('CloseListingUseCase', () => {
  let useCase: CloseListingUseCase;
  let mockRepo: { findById: jest.Mock; save: jest.Mock };
  let mockVideo: { purgeListingVideoFromListing: jest.Mock };

  const listingId = '550e8400-e29b-41d4-a716-446655440001';
  const userId = '650e8400-e29b-41d4-a716-446655440002';

  beforeEach(async () => {
    mockRepo = {
      findById: jest.fn(),
      save: jest.fn(async (l: Listing) => l),
    };
    mockVideo = {
      purgeListingVideoFromListing: jest.fn(async (l: Listing) => {
        l.video = null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CloseListingUseCase,
        { provide: LISTING_REPOSITORY, useValue: mockRepo },
        {
          provide: LISTING_CACHE,
          useValue: {
            invalidateSearch: jest.fn(async () => undefined),
            invalidateSingle: jest.fn(async () => undefined),
            invalidateSimilar: jest.fn(async () => undefined),
          },
        },
        {
          provide: PROMOTION_HISTORY_WRITER,
          useValue: { updateEndDateForListing: jest.fn(async () => undefined) },
        },
        {
          provide: ListingAiReportService,
          useValue: { deleteByListingId: jest.fn(async () => undefined) },
        },
        { provide: ListingVideoService, useValue: mockVideo },
      ],
    }).compile();

    useCase = module.get(CloseListingUseCase);
  });

  it('calls purgeListingVideoFromListing before close and persists closed listing once', async () => {
    const listing = Object.assign(Object.create(Listing.prototype), {
      id: listingId,
      user_id: userId,
      status: 'Active',
      is_promoted: false,
      promoted_until: null,
      promoted_started_at: null,
      promoted_paused_at: null,
      video: { status: 'published' as const },
    }) as Listing;

    mockRepo.findById.mockResolvedValue(listing);

    const result = await useCase.execute(listingId, userId);

    expect(mockVideo.purgeListingVideoFromListing.mock.invocationCallOrder[0]).toBeLessThan(
      mockRepo.save.mock.invocationCallOrder[0],
    );
    expect(mockVideo.purgeListingVideoFromListing).toHaveBeenCalledWith(listing);
    expect(result.status).toBe('Closed');
    expect(mockRepo.save).toHaveBeenCalledTimes(1);
  });
});
