import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { RedisService } from '../../../common/redis.service';
import { IListingRepository, LISTING_REPOSITORY } from '../ports/listing.repository.port';

const PHONE_RATE_LIMIT_TTL_SEC = 3600;
const PHONE_RATE_LIMIT_AUTH_MAX = 50;
const PHONE_RATE_LIMIT_ANON_MAX = 20;
const PHONE_RATE_LIMIT_KEY_AUTH_PREFIX = 'phone:seen:u:';
const PHONE_RATE_LIMIT_KEY_ANON_PREFIX = 'phone:seen:a:';

export interface GetListingPhonesViewer {
  userId: string | null;
  visitorHash: string | null;
  isAdmin?: boolean;
}

@Injectable()
export class GetListingPhonesUseCase {
  private readonly logger = new Logger(GetListingPhonesUseCase.name);

  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listingRepo: IListingRepository,
    private readonly redisService: RedisService,
  ) {}

  private buildViewerLogLabel(viewer: GetListingPhonesViewer): string {
    if (viewer.userId) {
      return `userId=${viewer.userId}`;
    }
    if (viewer.visitorHash) {
      return `visitorHash=${viewer.visitorHash.slice(0, 8)}`;
    }
    return 'viewer=unknown';
  }

  async execute(
    listingId: string,
    viewer: GetListingPhonesViewer,
  ): Promise<{ phone: string | null; additionalPhone: string | null }> {
    const logLabel = this.buildViewerLogLabel(viewer);
    const listing = await this.listingRepo.findById(listingId);
    if (!listing) {
      this.logger.log(`Phone request listingId=${listingId} ${logLabel} status=not_found`);
      throw new NotFoundException('errors.listingNotFound');
    }

    const user = listing.user;
    const rawPhone = user?.phone?.trim() ?? '';
    const rawAdditional = user?.additionalPhone?.trim() ?? '';
    if (!rawPhone && !rawAdditional) {
      this.logger.log(`Phone request listingId=${listingId} ${logLabel} status=no_phones`);
      throw new NotFoundException('errors.listingNotFound');
    }

    const isOwner = !!viewer.userId && listing.user_id === viewer.userId;
    const bypassRateLimit = isOwner || !!viewer.isAdmin;
    if (!bypassRateLimit) {
      if (viewer.userId) {
        await this.applyRateLimit(
          `${PHONE_RATE_LIMIT_KEY_AUTH_PREFIX}${viewer.userId}`,
          listingId,
          {
            max: PHONE_RATE_LIMIT_AUTH_MAX,
            logLabel: `userId=${viewer.userId}`,
          },
        );
      } else if (viewer.visitorHash) {
        await this.applyRateLimit(
          `${PHONE_RATE_LIMIT_KEY_ANON_PREFIX}${viewer.visitorHash}`,
          listingId,
          {
            max: PHONE_RATE_LIMIT_ANON_MAX,
            logLabel: `visitorHash=${viewer.visitorHash.slice(0, 8)}`,
          },
        );
      } else {
        this.logger.log(`Phone request listingId=${listingId} ${logLabel} status=invalid_request`);
        throw new BadRequestException('errors.invalidRequest');
      }
    }

    this.logger.log(`Phone request listingId=${listingId} ${logLabel} status=success`);
    return {
      phone: rawPhone || null,
      additionalPhone: rawAdditional || null,
    };
  }

  private async applyRateLimit(
    key: string,
    listingId: string,
    opts: { max: number; logLabel: string },
  ): Promise<void> {
    let added = 0;
    let unique = 0;
    try {
      const result = await this.redisService.rateLimitUnique(
        key,
        listingId,
        PHONE_RATE_LIMIT_TTL_SEC,
      );
      added = result.added;
      unique = result.unique;
    } catch {
      this.logger.warn(`Phone rate limit Redis error, allowing request (${opts.logLabel})`);
      return;
    }

    if (added === 1 && unique > opts.max) {
      await this.redisService.rollbackRateLimitUniqueMember(key, listingId);
      this.logger.log(`Phone request listingId=${listingId} ${opts.logLabel} status=rate_limited`);
      throw new HttpException('errors.phoneRateLimitExceeded', HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}
