import * as crypto from 'crypto';

import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import * as constants from '../../../common/constants';
import { ListingStatus as ListingStatusEnum } from '../../../common/types';
import { removePasswordFromUser } from '../../../common/utils/error-handling.utils';
import { ExchangeRatesService } from '../../../exchange-rates/exchange-rates.service';
import { UsersService } from '../../../users/application/users.service';
import { ListingView } from '../../entities/listing-view.entity';
import { Listing } from '../../entities/listing.entity';
import { IListingRepository, LISTING_REPOSITORY } from '../ports/listing.repository.port';

export interface GetListingContext {
  userId: string | null;
  ip?: string;
  userAgent?: string;
  includeFullVin?: boolean;
  isAdmin?: boolean;
}

@Injectable()
export class GetListingUseCase {
  private readonly logger = new Logger(GetListingUseCase.name);

  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listingRepo: IListingRepository,
    @InjectRepository(Listing)
    private readonly listingsRepository: Repository<Listing>,
    @InjectRepository(ListingView)
    private readonly listingViewsRepository: Repository<ListingView>,
    private readonly usersService: UsersService,
    private readonly exchangeRatesService: ExchangeRatesService,
  ) {}

  async execute(id: string, context?: GetListingContext): Promise<Listing> {
    const listing = await this.listingRepo.findById(id);

    if (!listing) {
      throw new NotFoundException('errors.listingNotFound');
    }

    if (!listing.vehicle) {
      this.logger.error(`Listing ${id} has no vehicle`);
      throw new NotFoundException('errors.vehicleNotFoundForListing');
    }

    if (listing.user) {
      listing.user = removePasswordFromUser(listing.user) as typeof listing.user;
      if (!listing.user.board_slug) {
        listing.user.board_slug = await this.usersService.ensureBoardSlug(
          listing.user_id,
          listing.user,
        );
      }
    }

    if (listing.status === ListingStatusEnum.Closed && !context?.isAdmin) {
      (listing as Partial<Listing>).price = undefined;
      (listing as Partial<Listing>).currency = undefined;
      if (listing.user) {
        listing.user.phone = null;
        listing.user.email = null;
        listing.user.firstName = null;
        listing.user.lastName = null;
        listing.user.companyName = null;
        listing.user.companyWebsiteUrl = null;
      }
    }

    if (listing.user && !listing.user.email && !listing.user.phone) {
      listing.user.phone = null;
      listing.user.email = null;
      listing.user.firstName = null;
      listing.user.lastName = null;
      listing.user.companyName = null;
      listing.user.companyWebsiteUrl = null;
    }

    if (context) {
      const userId = context.userId ?? null;
      let visitorId: string | null = null;
      if (!userId && context.ip !== undefined) {
        const userAgent = context.userAgent ?? 'unknown';
        visitorId = crypto.createHash('sha256').update(`${context.ip}:${userAgent}`).digest('hex');
      }
      this.recordView(id, userId, visitorId).catch(() => {});
    }

    const isOwner = !!context?.userId && listing.user_id === context.userId;
    const shouldIncludeFullVin = !!context?.includeFullVin && (isOwner || context?.isAdmin);
    if (listing.vin && listing.vin.length === 17 && !shouldIncludeFullVin) {
      (listing as Partial<Listing>).vin =
        listing.vin.slice(0, 4) + '*'.repeat(9) + listing.vin.slice(-4);
    }

    const defaultCurrency = constants.getDefaultCurrency();
    let approxPriceDefaultCurrency: number | null = null;
    if (listing.price !== undefined && listing.currency && listing.currency !== defaultCurrency) {
      approxPriceDefaultCurrency = await this.exchangeRatesService.convertToDefaultCurrency(
        listing.price,
        listing.currency,
      );
    }
    return {
      ...listing,
      approxPriceDefaultCurrency,
      defaultCurrencyCode: defaultCurrency,
    } as Listing & { approxPriceDefaultCurrency: number | null; defaultCurrencyCode: string };
  }

  private async recordView(
    listingId: string,
    userId: string | null,
    visitorId: string | null,
  ): Promise<void> {
    if (!userId && !visitorId) {
      return;
    }

    const listingMeta = await this.listingsRepository.findOne({
      where: { id: listingId },
      select: ['id', 'user_id'],
    });
    if (!listingMeta) {
      return;
    }

    if (userId && listingMeta.user_id && userId === listingMeta.user_id) {
      return;
    }

    if (userId) {
      const existingView = await this.listingViewsRepository.findOne({
        where: { listing_id: listingId, user_id: userId },
      });
      if (existingView) {
        return;
      }
      const view = this.listingViewsRepository.create({
        listing_id: listingId,
        user_id: userId,
      });
      await this.listingViewsRepository.save(view);
    } else if (visitorId) {
      const existingView = await this.listingViewsRepository.findOne({
        where: { listing_id: listingId, visitor_id: visitorId },
      });
      if (existingView) {
        return;
      }
      const view = this.listingViewsRepository.create({
        listing_id: listingId,
        visitor_id: visitorId,
      });
      await this.listingViewsRepository.save(view);
    }
  }
}
