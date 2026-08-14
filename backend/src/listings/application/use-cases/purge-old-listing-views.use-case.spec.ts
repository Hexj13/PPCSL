import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { ListingView } from '../../entities/listing-view.entity';

import {
  LISTING_VIEWS_RETENTION_MONTHS,
  PurgeOldListingViewsUseCase,
} from './purge-old-listing-views.use-case';

describe('PurgeOldListingViewsUseCase', () => {
  let useCase: PurgeOldListingViewsUseCase;
  let execute: jest.Mock;
  let where: jest.Mock;

  beforeEach(async () => {
    execute = jest.fn().mockResolvedValue({ affected: 4 });
    where = jest.fn().mockReturnValue({ execute });
    const from = jest.fn().mockReturnValue({ where });
    const deleteFn = jest.fn().mockReturnValue({ from });
    const listingViewRepository = {
      createQueryBuilder: jest.fn().mockReturnValue({ delete: deleteFn }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurgeOldListingViewsUseCase,
        { provide: getRepositoryToken(ListingView), useValue: listingViewRepository },
      ],
    }).compile();

    useCase = module.get(PurgeOldListingViewsUseCase);
  });

  it('deletes listing views older than 12 months', async () => {
    const result = await useCase.execute();

    expect(where).toHaveBeenCalledWith(`created_at < now() - (:months * interval '1 month')`, {
      months: LISTING_VIEWS_RETENTION_MONTHS,
    });
    expect(result.deleted).toBe(4);
  });
});
