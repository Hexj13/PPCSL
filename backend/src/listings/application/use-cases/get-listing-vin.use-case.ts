import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { RedisService } from '../../../common/redis.service';
import { IListingRepository, LISTING_REPOSITORY } from '../ports/listing.repository.port';

const VIN_RATE_LIMIT_TTL_SEC = 3600;
const VIN_RATE_LIMIT_MAX = 50;
const VIN_RATE_LIMIT_KEY_PREFIX = 'vin:seen:u:';

@Injectable()
export class GetListingVinUseCase {
  private readonly logger = new Logger(GetListingVinUseCase.name);

  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listingRepo: IListingRepository,
    private readonly redisService: RedisService,
  ) {}

  async execute(listingId: string, userId: string, action: string): Promise<{ vin: string }> {
    const listing = await this.listingRepo.findById(listingId);
    if (!listing) {
      this.logger.log(
        `VIN request listingId=${listingId} userId=${userId} action=${action} status=not_found`,
      );
      throw new NotFoundException('errors.listingNotFound');
    }
    if (!listing.vin?.trim()) {
      this.logger.log(
        `VIN request listingId=${listingId} userId=${userId} action=${action} status=no_vin`,
      );
      throw new NotFoundException('errors.listingNotFound');
    }

    const key = `${VIN_RATE_LIMIT_KEY_PREFIX}${userId}`;
    let added = 0;
    let unique = 0;
    try {
      const result = await this.redisService.rateLimitUnique(
        key,
        listingId,
        VIN_RATE_LIMIT_TTL_SEC,
      );
      added = result.added;
      unique = result.unique;
    } catch {
      this.logger.warn('VIN rate limit Redis error, allowing request');
      added = 0;
      unique = 0;
    }
    if (added === 1 && unique > VIN_RATE_LIMIT_MAX) {
      await this.redisService.rollbackRateLimitUniqueMember(key, listingId);
      this.logger.log(
        `VIN request listingId=${listingId} userId=${userId} action=${action} status=rate_limited`,
      );
      throw new HttpException('errors.vinRateLimitExceeded', HttpStatus.TOO_MANY_REQUESTS);
    }

    this.logger.log(
      `VIN request listingId=${listingId} userId=${userId} action=${action} status=success`,
    );
    return { vin: listing.vin.trim() };
  }
}
