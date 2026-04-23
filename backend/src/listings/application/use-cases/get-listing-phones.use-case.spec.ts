import { Test, TestingModule } from '@nestjs/testing';

import { RedisService } from '../../../common/redis.service';
import { User } from '../../../users/entities/user.entity';
import { Listing } from '../../entities/listing.entity';
import { LISTING_REPOSITORY } from '../ports/listing.repository.port';

import { GetListingPhonesUseCase } from './get-listing-phones.use-case';

describe('GetListingPhonesUseCase', () => {
  let useCase: GetListingPhonesUseCase;
  let listingRepo: { findById: jest.Mock };
  let redis: { rateLimitUnique: jest.Mock; rollbackRateLimitUniqueMember: jest.Mock };

  const listingId = '550e8400-e29b-41d4-a716-446655440001';
  const ownerId = '550e8400-e29b-41d4-a716-446655440002';
  const viewerId = '550e8400-e29b-41d4-a716-446655440003';

  function makeListing(overrides: Partial<Listing> = {}): Listing {
    const user = {
      id: ownerId,
      phone: '+37369123456',
      additionalPhone: '+37369111111',
    } as User;
    return {
      id: listingId,
      user_id: ownerId,
      user,
      ...overrides,
    } as Listing;
  }

  beforeEach(async () => {
    listingRepo = { findById: jest.fn() };
    redis = {
      rateLimitUnique: jest.fn(),
      rollbackRateLimitUniqueMember: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetListingPhonesUseCase,
        { provide: LISTING_REPOSITORY, useValue: listingRepo },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    useCase = module.get(GetListingPhonesUseCase);
  });

  it('returns phones for listing owner without rate limit', async () => {
    listingRepo.findById.mockResolvedValue(makeListing());

    const result = await useCase.execute(listingId, { userId: ownerId, visitorHash: null });

    expect(result).toEqual({ phone: '+37369123456', additionalPhone: '+37369111111' });
    expect(redis.rateLimitUnique).not.toHaveBeenCalled();
  });

  it('returns phones for admin without rate limit', async () => {
    listingRepo.findById.mockResolvedValue(makeListing());

    const result = await useCase.execute(listingId, {
      userId: viewerId,
      visitorHash: null,
      isAdmin: true,
    });

    expect(result).toEqual({ phone: '+37369123456', additionalPhone: '+37369111111' });
    expect(redis.rateLimitUnique).not.toHaveBeenCalled();
  });

  it('throws when no phones', async () => {
    listingRepo.findById.mockResolvedValue(
      makeListing({
        user: { id: ownerId, phone: '', additionalPhone: '' } as User,
      }),
    );

    await expect(
      useCase.execute(listingId, { userId: viewerId, visitorHash: null }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('allows duplicate listing for same viewer without counting again', async () => {
    listingRepo.findById.mockResolvedValue(makeListing());
    redis.rateLimitUnique.mockResolvedValue({ added: 0, unique: 5 });

    const result = await useCase.execute(listingId, { userId: viewerId, visitorHash: null });

    expect(result.phone).toBe('+37369123456');
    expect(redis.rollbackRateLimitUniqueMember).not.toHaveBeenCalled();
  });

  it('throws 429 when new unique exceeds auth limit', async () => {
    listingRepo.findById.mockResolvedValue(makeListing());
    redis.rateLimitUnique.mockResolvedValue({ added: 1, unique: 21 });

    await expect(
      useCase.execute(listingId, { userId: viewerId, visitorHash: null }),
    ).rejects.toMatchObject({ status: 429 });

    expect(redis.rollbackRateLimitUniqueMember).toHaveBeenCalled();
  });

  it('throws 429 when new unique exceeds anon limit', async () => {
    listingRepo.findById.mockResolvedValue(makeListing());
    redis.rateLimitUnique.mockResolvedValue({ added: 1, unique: 6 });

    await expect(
      useCase.execute(listingId, { userId: null, visitorHash: 'abc' }),
    ).rejects.toMatchObject({ status: 429 });
  });

  it('skips rate limit when Redis errors', async () => {
    listingRepo.findById.mockResolvedValue(makeListing());
    redis.rateLimitUnique.mockRejectedValue(new Error('redis down'));

    const result = await useCase.execute(listingId, { userId: viewerId, visitorHash: null });

    expect(result.phone).toBe('+37369123456');
  });
});
