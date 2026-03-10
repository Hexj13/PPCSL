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
const VIN_RATE_LIMIT_MAX = 5;
const VIN_RATE_LIMIT_KEY_PREFIX = 'vin:rate:';

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
    let count: number;
    try {
      count = await this.redisService.rateLimitIncr(key, VIN_RATE_LIMIT_TTL_SEC);
    } catch {
      this.logger.warn('VIN rate limit Redis error, allowing request');
      count = 0;
    }
    if (count > VIN_RATE_LIMIT_MAX) {
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
