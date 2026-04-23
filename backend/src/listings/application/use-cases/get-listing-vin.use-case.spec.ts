import { Test, TestingModule } from '@nestjs/testing';

import { RedisService } from '../../../common/redis.service';
import { Listing } from '../../entities/listing.entity';
import { LISTING_REPOSITORY } from '../ports/listing.repository.port';

import { GetListingVinUseCase } from './get-listing-vin.use-case';

describe('GetListingVinUseCase', () => {
  let useCase: GetListingVinUseCase;
  let listingRepo: { findById: jest.Mock };
  let redis: { rateLimitUnique: jest.Mock; rollbackRateLimitUniqueMember: jest.Mock };

  const listingId = '550e8400-e29b-41d4-a716-446655440001';
  const userId = '550e8400-e29b-41d4-a716-446655440002';
  const vin = 'WBA3A5G59CNP12345';

  beforeEach(async () => {
    listingRepo = { findById: jest.fn() };
    redis = {
      rateLimitUnique: jest.fn(),
      rollbackRateLimitUniqueMember: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetListingVinUseCase,
        { provide: LISTING_REPOSITORY, useValue: listingRepo },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    useCase = module.get(GetListingVinUseCase);
  });

  it('returns VIN when under unique listing limit', async () => {
    listingRepo.findById.mockResolvedValue({ id: listingId, vin } as Listing);
    redis.rateLimitUnique.mockResolvedValue({ added: 1, unique: 3 });

    const result = await useCase.execute(listingId, userId, 'reveal');

    expect(result).toEqual({ vin });
    expect(redis.rollbackRateLimitUniqueMember).not.toHaveBeenCalled();
  });

  it('does not rate limit repeat for same listing', async () => {
    listingRepo.findById.mockResolvedValue({ id: listingId, vin } as Listing);
    redis.rateLimitUnique.mockResolvedValue({ added: 0, unique: 5 });

    const result = await useCase.execute(listingId, userId, 'reveal');

    expect(result.vin).toBe(vin);
    expect(redis.rollbackRateLimitUniqueMember).not.toHaveBeenCalled();
  });

  it('throws 429 when unique listings exceed 20', async () => {
    listingRepo.findById.mockResolvedValue({ id: listingId, vin } as Listing);
    redis.rateLimitUnique.mockResolvedValue({ added: 1, unique: 21 });

    await expect(useCase.execute(listingId, userId, 'reveal')).rejects.toMatchObject({
      status: 429,
    });

    expect(redis.rollbackRateLimitUniqueMember).toHaveBeenCalled();
  });

  it('allows request when Redis fails', async () => {
    listingRepo.findById.mockResolvedValue({ id: listingId, vin } as Listing);
    redis.rateLimitUnique.mockRejectedValue(new Error('redis down'));

    const result = await useCase.execute(listingId, userId, 'reveal');

    expect(result.vin).toBe(vin);
  });
});
