import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { ListingCategory } from '../../../common/constants';
import { ExchangeRatesService } from '../../../exchange-rates/exchange-rates.service';
import { UsersService } from '../../../users/application/users.service';
import { ListingView } from '../../entities/listing-view.entity';
import { Listing } from '../../entities/listing.entity';
import { ListingViewsCounterService } from '../../infrastructure/services/listing-views-counter.service';
import { LISTING_REPOSITORY } from '../ports/listing.repository.port';

import { GetListingUseCase } from './get-listing.use-case';

describe('GetListingUseCase', () => {
  let useCase: GetListingUseCase;
  let listingRepo: { findById: jest.Mock };
  let listingsRepository: { findOne: jest.Mock };
  let listingViewsRepository: { findOne: jest.Mock; createQueryBuilder: jest.Mock };
  let listingViewsCounterService: { recordPendingView: jest.Mock };

  const listingId = '0ae03b54-4da0-4c5c-bbfa-812956377577';
  const ownerId = '650e8400-e29b-41d4-a716-446655440002';
  const viewerId = '750e8400-e29b-41d4-a716-446655440003';

  function makeListing(overrides: Partial<Listing> = {}): Listing {
    return {
      id: listingId,
      user_id: ownerId,
      category: ListingCategory.Vehicle,
      vehicle: { id: 'vehicle-1' },
      user: {
        id: ownerId,
        board_slug: 'owner',
        email: 'owner@example.com',
        phone: '+37369123456',
      },
      price: 10000,
      currency: 'EUR',
      ...overrides,
    } as Listing;
  }

  function mockInsert(raw: unknown[]) {
    const chain = {
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      orIgnore: jest.fn().mockReturnThis(),
      returning: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ raw }),
    };
    listingViewsRepository.createQueryBuilder.mockReturnValue(chain);
    return chain;
  }

  async function executeAndAwaitView(context: {
    userId: string | null;
    ip?: string;
    userAgent?: string;
  }): Promise<void> {
    const recordView = jest.spyOn(
      useCase as unknown as { recordView: (...args: unknown[]) => Promise<void> },
      'recordView',
    );
    await useCase.execute(listingId, context);
    const pending = recordView.mock.results[0]?.value as Promise<void> | undefined;
    if (pending) {
      await pending;
    }
  }

  beforeEach(async () => {
    listingRepo = { findById: jest.fn() };
    listingsRepository = { findOne: jest.fn() };
    listingViewsRepository = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    listingViewsCounterService = { recordPendingView: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetListingUseCase,
        { provide: LISTING_REPOSITORY, useValue: listingRepo },
        { provide: getRepositoryToken(Listing), useValue: listingsRepository },
        { provide: getRepositoryToken(ListingView), useValue: listingViewsRepository },
        { provide: UsersService, useValue: { ensureBoardSlug: jest.fn() } },
        { provide: ExchangeRatesService, useValue: { convertToDefaultCurrency: jest.fn() } },
        { provide: ListingViewsCounterService, useValue: listingViewsCounterService },
      ],
    }).compile();

    useCase = module.get(GetListingUseCase);
  });

  it('records a unique anonymous view and increments the pending counter', async () => {
    listingRepo.findById.mockResolvedValue(makeListing());
    listingsRepository.findOne.mockResolvedValue({ id: listingId, user_id: ownerId });
    listingViewsRepository.findOne.mockResolvedValue(null);
    const insert = mockInsert([{ id: 'view-1' }]);

    await executeAndAwaitView({ userId: null, ip: '127.0.0.1', userAgent: 'jest' });

    expect(insert.orIgnore).toHaveBeenCalled();
    expect(insert.values).toHaveBeenCalledWith({
      listing_id: listingId,
      visitor_id: expect.any(String),
    });
    expect(listingViewsCounterService.recordPendingView).toHaveBeenCalledWith(listingId);
  });

  it('does not insert when the visitor already has a view', async () => {
    listingRepo.findById.mockResolvedValue(makeListing());
    listingsRepository.findOne.mockResolvedValue({ id: listingId, user_id: ownerId });
    listingViewsRepository.findOne.mockResolvedValue({ id: 'existing-view' });

    await executeAndAwaitView({ userId: null, ip: '127.0.0.1', userAgent: 'jest' });

    expect(listingViewsRepository.createQueryBuilder).not.toHaveBeenCalled();
    expect(listingViewsCounterService.recordPendingView).not.toHaveBeenCalled();
  });

  it('does not increment the counter when insert is ignored as a duplicate', async () => {
    listingRepo.findById.mockResolvedValue(makeListing());
    listingsRepository.findOne.mockResolvedValue({ id: listingId, user_id: ownerId });
    listingViewsRepository.findOne.mockResolvedValue(null);
    mockInsert([]);

    await executeAndAwaitView({ userId: null, ip: '127.0.0.1', userAgent: 'jest' });

    expect(listingViewsCounterService.recordPendingView).not.toHaveBeenCalled();
  });

  it('treats a unique-constraint error as an already recorded view', async () => {
    listingRepo.findById.mockResolvedValue(makeListing());
    listingsRepository.findOne.mockResolvedValue({ id: listingId, user_id: ownerId });
    listingViewsRepository.findOne.mockResolvedValue(null);
    const insert = mockInsert([{ id: 'view-1' }]);
    const duplicate = Object.assign(new Error('duplicate key'), { code: '23505' });
    insert.execute.mockRejectedValue(duplicate);

    await executeAndAwaitView({ userId: null, ip: '127.0.0.1', userAgent: 'jest' });

    expect(listingViewsCounterService.recordPendingView).not.toHaveBeenCalled();
  });

  it('does not record a view when the listing owner opens their own listing', async () => {
    listingRepo.findById.mockResolvedValue(makeListing());
    listingsRepository.findOne.mockResolvedValue({ id: listingId, user_id: ownerId });

    await executeAndAwaitView({ userId: ownerId });

    expect(listingViewsRepository.findOne).not.toHaveBeenCalled();
    expect(listingViewsRepository.createQueryBuilder).not.toHaveBeenCalled();
    expect(listingViewsCounterService.recordPendingView).not.toHaveBeenCalled();
  });

  it('records a unique logged-in viewer and increments the pending counter', async () => {
    listingRepo.findById.mockResolvedValue(makeListing());
    listingsRepository.findOne.mockResolvedValue({ id: listingId, user_id: ownerId });
    listingViewsRepository.findOne.mockResolvedValue(null);
    const insert = mockInsert([{ id: 'view-2' }]);

    await executeAndAwaitView({ userId: viewerId });

    expect(insert.values).toHaveBeenCalledWith({
      listing_id: listingId,
      user_id: viewerId,
    });
    expect(listingViewsCounterService.recordPendingView).toHaveBeenCalledWith(listingId);
  });
});
