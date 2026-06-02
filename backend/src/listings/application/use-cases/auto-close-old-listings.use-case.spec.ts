import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { ListingStatus as ListingStatusEnum } from '../../../common/types';
import { Listing } from '../../entities/listing.entity';
import { ListingVideoService } from '../../video/listing-video.service';
import { ListingAiReportService } from '../listing-ai-report.service';
import { LISTING_CACHE } from '../ports/listing-cache.port';
import { PROMOTION_HISTORY_WRITER } from '../ports/promotion-history.port';

import { AutoCloseOldListingsUseCase } from './auto-close-old-listings.use-case';

jest.mock('@sentry/node', () => ({
  withMonitor: jest.fn((_name: string, fn: () => Promise<{ closed: number }>) => fn()),
}));

describe('AutoCloseOldListingsUseCase', () => {
  let useCase: AutoCloseOldListingsUseCase;
  let listingsRepository: {
    find: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let listingVideoService: { deleteS3ObjectsForVideoJson: jest.Mock };
  let updateChain: {
    update: jest.Mock;
    set: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    execute: jest.Mock;
  };

  beforeEach(async () => {
    const selectChain = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest
        .fn()
        .mockResolvedValue([
          { id: 'x1', video: { status: 'published' as const, webmKey: '/out.webm' } },
        ]),
    };
    updateChain = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    listingsRepository = {
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn((alias?: string) => {
        if (alias === 'l') {
          return selectChain;
        }
        return updateChain;
      }),
    };

    listingVideoService = {
      deleteS3ObjectsForVideoJson: jest.fn(async () => undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutoCloseOldListingsUseCase,
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

    useCase = module.get(AutoCloseOldListingsUseCase);
  });

  it('auto-close sets video null on update and deletes S3 using snapshots before invalidate', async () => {
    const result = await useCase.execute();

    expect(updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ListingStatusEnum.Closed,
        video: null,
      }),
    );
    expect(listingVideoService.deleteS3ObjectsForVideoJson).toHaveBeenCalledWith({
      status: 'published',
      webmKey: '/out.webm',
    });
    expect(result.closed).toBe(1);
  });
});
