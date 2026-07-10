import { RedisService } from '../../../common/redis.service';
import type { PopularListingsData } from '../../domain/popular-listings.types';

import { RedisListingCache } from './redis-listing-cache';

describe('RedisListingCache', () => {
  let cache: RedisListingCache;
  let redisService: { getJson: jest.Mock; setJson: jest.Mock };

  beforeEach(() => {
    redisService = {
      getJson: jest.fn(),
      setJson: jest.fn(),
    };
    cache = new RedisListingCache(redisService as unknown as RedisService);
  });

  it('uses a versioned key for popular listings cache data', async () => {
    await cache.getPopularListings();
    await cache.setPopularListings({} as PopularListingsData);

    expect(redisService.getJson).toHaveBeenCalledWith('cache:listings:popular:v2:car');
    expect(redisService.setJson).toHaveBeenCalledWith('cache:listings:popular:v2:car', {}, 93600);
  });
});
