import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { logUserEvent } from '../../../common/utils/log-user-event';
import { UsersService } from '../../../users/application/users.service';
import { Listing } from '../../entities/listing.entity';
import { IListingCache, LISTING_CACHE } from '../ports/listing-cache.port';
import { IListingRepository, LISTING_REPOSITORY } from '../ports/listing.repository.port';

@Injectable()
export class PublishListingUseCase {
  private readonly logger = new Logger(PublishListingUseCase.name);

  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listingRepo: IListingRepository,
    @Inject(LISTING_CACHE)
    private readonly listingCache: IListingCache,
    private readonly usersService: UsersService,
  ) {}

  async execute(listingId: string, userId: string): Promise<Listing> {
    const listing = await this.listingRepo.findById(listingId);
    if (!listing) {
      throw new NotFoundException('errors.listingNotFound');
    }
    if (listing.user_id !== userId) {
      throw new ForbiddenException('errors.listingAccessDenied');
    }

    const activeCount = await this.listingRepo.countActiveByUser(userId);
    const limit = await this.usersService.getListingLimit(userId);
    if (listing.status === 'Active') {
      throw new BadRequestException('errors.listingAlreadyActive');
    }
    if (activeCount >= limit) {
      throw new BadRequestException(`errors.activeListingsLimitExceeded|${limit}`);
    }

    const previousStatus = listing.status;
    listing.publish();
    const saved = await this.listingRepo.save(listing);
    await this.listingCache.invalidateSearch();
    await this.listingCache.invalidateSingle(listingId);
    logUserEvent(this.logger, {
      event: 'listing_published',
      userId,
      listingId,
      previousStatus,
      newStatus: saved.status,
    });
    return saved;
  }
}
