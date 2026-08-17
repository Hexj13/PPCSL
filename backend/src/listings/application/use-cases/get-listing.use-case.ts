import * as crypto from 'crypto';

import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import * as constants from '../../../common/constants';
import { removePasswordFromUser } from '../../../common/utils/error-handling.utils';
import { maskPhoneLastDigits } from '../../../common/utils/phone-mask.util';
import { ExchangeRatesService } from '../../../exchange-rates/exchange-rates.service';
import { UsersService } from '../../../users/application/users.service';
import { ListingView } from '../../entities/listing-view.entity';
import { Listing } from '../../entities/listing.entity';
import { ListingViewsCounterService } from '../../infrastructure/services/listing-views-counter.service';
import { buildListingVideoForGetListing } from '../../video/listing-video-response.util';
import { IListingRepository, LISTING_REPOSITORY } from '../ports/listing.repository.port';
import { maskClosedListingForPublicView } from '../utils/mask-closed-listing-for-public-view';

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
    private readonly listingViewsCounterService: ListingViewsCounterService,
  ) {}

  async execute(id: string, context?: GetListingContext): Promise<Listing> {
    const listing = await this.listingRepo.findById(id);

    if (!listing) {
      throw new NotFoundException('errors.listingNotFound');
    }

    if (listing.category === constants.ListingCategory.Tire) {
      if (!listing.tire) {
        this.logger.error(`Listing ${id} has no tire`);
        throw new NotFoundException('errors.tireNotFoundForListing');
      }
    } else if (!listing.vehicle) {
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

    if (!context?.isAdmin) {
      maskClosedListingForPublicView(listing);
    }

    if (listing.user && !listing.user.email && !listing.user.phone) {
      listing.user.phone = null;
      listing.user.additionalPhone = null;
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

    const shouldIncludeFullPhones = isOwner || !!context?.isAdmin;
    if (listing.user && !shouldIncludeFullPhones) {
      if (listing.user.phone) {
        listing.user.phone = maskPhoneLastDigits(listing.user.phone);
      }
      if (listing.user.additionalPhone) {
        listing.user.additionalPhone = maskPhoneLastDigits(listing.user.additionalPhone);
      }
    }

    const defaultCurrency = constants.getDefaultCurrency();
    let approxPriceDefaultCurrency: number | null = null;
    if (listing.price !== undefined && listing.currency && listing.currency !== defaultCurrency) {
      approxPriceDefaultCurrency = await this.exchangeRatesService.convertToDefaultCurrency(
        listing.price,
        listing.currency,
      );
    }
    buildListingVideoForGetListing(listing, context?.userId ?? null, context?.isAdmin);
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

    const values = userId
      ? { listing_id: listingId, user_id: userId }
      : { listing_id: listingId, visitor_id: visitorId! };

    const existingView = await this.listingViewsRepository.findOne({ where: values });
    if (existingView) {
      return;
    }

    const inserted = await this.insertViewIfAbsent(values);
    if (inserted) {
      await this.listingViewsCounterService.recordPendingView(listingId);
    }
  }

  private async insertViewIfAbsent(values: {
    listing_id: string;
    user_id?: string;
    visitor_id?: string;
  }): Promise<boolean> {
    try {
      const result = await this.listingViewsRepository
        .createQueryBuilder()
        .insert()
        .into(ListingView)
        .values(values)
        .orIgnore()
        .returning('id')
        .execute();

      return Array.isArray(result.raw) && result.raw.length > 0;
    } catch (error) {
      if (isUniqueViolation(error)) {
        return false;
      }
      throw error;
    }
  }
}

function isUniqueViolation(error: unknown): boolean {
  const candidate = error as { code?: string; driverError?: { code?: string } };
  return candidate?.code === '23505' || candidate?.driverError?.code === '23505';
}
