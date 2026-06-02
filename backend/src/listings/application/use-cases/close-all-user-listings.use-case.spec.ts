import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In } from 'typeorm';

import { ListingStatus as ListingStatusEnum } from '../../../common/types';
import { Listing } from '../../entities/listing.entity';
import { ListingVideoService } from '../../video/listing-video.service';
import { ListingAiReportService } from '../listing-ai-report.service';
import { LISTING_CACHE } from '../ports/listing-cache.port';
import { PROMOTION_HISTORY_WRITER } from '../ports/promotion-history.port';

import { CloseAllUserListingsUseCase } from './close-all-user-listings.use-case';

describe('CloseAllUserListingsUseCase', () => {
  let useCase: CloseAllUserListingsUseCase;
  let listingsRepository: { find: jest.Mock; update: jest.Mock };
  let listingVideoService: { deleteS3ObjectsForVideoJson: jest.Mock };

  const userId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(async () => {
    listingsRepository = {
      find: jest.fn(),
      update: jest.fn(),
    };
    listingVideoService = {
      deleteS3ObjectsForVideoJson: jest.fn(async () => undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CloseAllUserListingsUseCase,
        { provide: getRepositoryToken(Listing), useValue: listingsRepository },
        {
          provide: PROMOTION_HISTORY_WRITER,
          useValue: { updateEndDateForListing: jest.fn(async () => undefined) },
        },
        {
          provide: LISTING_CACHE,
          useValue: {
            invalidateSearch: jest.fn(async () => undefined),
            invalidateSingle: jest.fn(async () => undefined),
            invalidateSimilar: jest.fn(async () => undefined),
          },
        },
        {
          provide: ListingAiReportService,
          useValue: { deleteByListingIds: jest.fn(async () => undefined) },
        },
        { provide: ListingVideoService, useValue: listingVideoService },
      ],
    }).compile();

    useCase = module.get(CloseAllUserListingsUseCase);
  });

  it('bulk close sets video null and deletes S3 for listings that had video JSON', async () => {
    listingsRepository.find.mockImplementation(
      async (opts?: { where?: Record<string, unknown> }) => {
        if (opts?.where && opts.where.is_promoted === true) {
          return [];
        }
        return [
          { id: 'l1', video: { status: 'published' as const, webmKey: '/w.webm' } },
          { id: 'l2', video: null },
        ];
      },
    );
    listingsRepository.update.mockResolvedValue({ affected: 2 });

    await useCase.execute(userId);

    expect(listingsRepository.update).toHaveBeenCalledWith(
      {
        user_id: userId,
        status: In([ListingStatusEnum.Active, ListingStatusEnum.Paused]),
      },
      expect.objectContaining({
        video: null,
      }),
    );
    expect(listingVideoService.deleteS3ObjectsForVideoJson).toHaveBeenCalledTimes(1);
    expect(listingVideoService.deleteS3ObjectsForVideoJson).toHaveBeenCalledWith({
      status: 'published',
      webmKey: '/w.webm',
    });
  });
});
