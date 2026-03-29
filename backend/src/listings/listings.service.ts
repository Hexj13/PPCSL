import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { IBrandsCache, BRANDS_CACHE } from '../brands/application/ports/brands-cache.port';
import { ListingCategory } from '../common/constants';

import { IListingCache, LISTING_CACHE } from './application/ports/listing-cache.port';
import {
  IListingRepository,
  LISTING_REPOSITORY,
} from './application/ports/listing.repository.port';
import { AutoCloseOldListingsUseCase } from './application/use-cases/auto-close-old-listings.use-case';
import { CloseAllUserListingsUseCase } from './application/use-cases/close-all-user-listings.use-case';
import { CloseListingUseCase } from './application/use-cases/close-listing.use-case';
import { CreateListingUseCase } from './application/use-cases/create-listing.use-case';
import { CreatePromotionHistoryUseCase } from './application/use-cases/create-promotion-history.use-case';
import { ExpirePromotionsUseCase } from './application/use-cases/expire-promotions.use-case';
import { FindByVinUseCase } from './application/use-cases/find-by-vin.use-case';
import { FindSimilarUseCase } from './application/use-cases/find-similar.use-case';
import { GetActiveUserListingsUseCase } from './application/use-cases/get-active-user-listings.use-case';
import { GetBoardListingsUseCase } from './application/use-cases/get-board-listings.use-case';
import { GetListingHistoryUseCase } from './application/use-cases/get-listing-history.use-case';
import { GetListingVinUseCase } from './application/use-cases/get-listing-vin.use-case';
import { GetListingUseCase } from './application/use-cases/get-listing.use-case';
import { GetPromotionAccessUseCase } from './application/use-cases/get-promotion-access.use-case';
import { GetPromotionHistoryUseCase } from './application/use-cases/get-promotion-history.use-case';
import { GetReportUrlUseCase } from './application/use-cases/get-report-url.use-case';
import { GetUserListingsUseCase } from './application/use-cases/get-user-listings.use-case';
import { HasPromotionHistoryUseCase } from './application/use-cases/has-promotion-history.use-case';
import { PauseListingUseCase } from './application/use-cases/pause-listing.use-case';
import { PublishListingUseCase } from './application/use-cases/publish-listing.use-case';
import { RefreshAllDatesUseCase } from './application/use-cases/refresh-all-dates.use-case';
import { SearchListingsUseCase } from './application/use-cases/search-listings.use-case';
import { TogglePromotionUseCase } from './application/use-cases/toggle-promotion.use-case';
import { UpdateListingUseCase } from './application/use-cases/update-listing.use-case';
import { UpdatePromotionHistoryEndDateUseCase } from './application/use-cases/update-promotion-history-end-date.use-case';
import { getVehicleTypeFromBodyType } from './domain/utils/vehicle-type.utils';
import { Listing } from './entities/listing.entity';
import { CreateListingDto } from './presentation/dto/create-listing.dto';
import { SearchListingsDto } from './presentation/dto/search-listings.dto';
import { TogglePromotionDto } from './presentation/dto/toggle-promotion.dto';
import { UpdateListingDto } from './presentation/dto/update-listing.dto';

type ListingDataKeys = Exclude<
  keyof Listing,
  | 'isActive'
  | 'isPromoted'
  | 'canBeEdited'
  | 'canBePublished'
  | 'publish'
  | 'pause'
  | 'close'
  | 'startPromotion'
  | 'pausePromotion'
  | 'resumePromotion'
  | 'stopPromotion'
>;
type ListingData = Pick<Listing, ListingDataKeys>;

@Injectable()
export class ListingsService {
  private readonly logger = new Logger(ListingsService.name);

  constructor(
    @Inject(LISTING_CACHE)
    private readonly listingCache: IListingCache,
    @Inject(BRANDS_CACHE)
    private readonly brandsCache: IBrandsCache,
    @Inject(LISTING_REPOSITORY)
    private readonly listingRepo: IListingRepository,
    private readonly createListingUseCase: CreateListingUseCase,
    private readonly searchListingsUseCase: SearchListingsUseCase,
    private readonly getListingUseCase: GetListingUseCase,
    private readonly updateListingUseCase: UpdateListingUseCase,
    private readonly publishListingUseCase: PublishListingUseCase,
    private readonly pauseListingUseCase: PauseListingUseCase,
    private readonly closeListingUseCase: CloseListingUseCase,
    private readonly togglePromotionUseCase: TogglePromotionUseCase,
    private readonly findSimilarUseCase: FindSimilarUseCase,
    private readonly getUserListingsUseCase: GetUserListingsUseCase,
    private readonly getActiveUserListingsUseCase: GetActiveUserListingsUseCase,
    private readonly getBoardListingsUseCase: GetBoardListingsUseCase,
    private readonly findByVinUseCase: FindByVinUseCase,
    private readonly getListingVinUseCase: GetListingVinUseCase,
    private readonly getListingHistoryUseCase: GetListingHistoryUseCase,
    private readonly getReportUrlUseCase: GetReportUrlUseCase,
    private readonly refreshAllDatesUseCase: RefreshAllDatesUseCase,
    private readonly getPromotionHistoryUseCase: GetPromotionHistoryUseCase,
    private readonly hasPromotionHistoryUseCase: HasPromotionHistoryUseCase,
    private readonly getPromotionAccessUseCase: GetPromotionAccessUseCase,
    private readonly createPromotionHistoryUseCase: CreatePromotionHistoryUseCase,
    private readonly updatePromotionHistoryEndDateUseCase: UpdatePromotionHistoryEndDateUseCase,
    private readonly closeAllUserListingsUseCase: CloseAllUserListingsUseCase,
    private readonly autoCloseOldListingsUseCase: AutoCloseOldListingsUseCase,
    private readonly expirePromotionsUseCase: ExpirePromotionsUseCase,
  ) {}

  async create(
    createListingDto: CreateListingDto,
    userId: string,
    userType?: string,
  ): Promise<Listing> {
    const savedListing = await this.createListingUseCase.execute(
      createListingDto,
      userId,
      userType,
    );
    this.logger.log(
      JSON.stringify({
        event: 'listing_created',
        listingId: savedListing.id,
        ownerUserId: savedListing.user_id,
        actorUserId: userId,
      }),
    );
    const Sentry = await import('@sentry/node');
    let vehicle_type: string =
      savedListing.vehicle?.model?.vehicle_types?.[0] ||
      (savedListing.vehicle?.body_type
        ? getVehicleTypeFromBodyType(savedListing.vehicle.body_type)
        : undefined) ||
      'unknown';
    if (savedListing.category === ListingCategory.Tire) {
      vehicle_type = savedListing.tire?.tire_vehicle_type ?? 'unknown';
    }
    Sentry.metrics.count('listings.created', 1, {
      attributes: {
        status: savedListing.status,
        currency: savedListing.currency,
        vehicle_type: vehicle_type,
        is_promoted: savedListing.is_promoted || false,
      },
    });
    return savedListing;
  }

  async findAll(searchDto: SearchListingsDto) {
    const result = await this.searchListingsUseCase.execute(searchDto);
    const Sentry = await import('@sentry/node');
    Sentry.metrics.count('listings.searches', 1, {
      attributes: {
        has_filters: !!(
          searchDto.brand_ids ||
          searchDto.model_ids ||
          searchDto.vehicleType ||
          searchDto.price_gte ||
          searchDto.price_lte
        ),
        results_count: result.meta.total,
        page: result.meta.page,
        vehicle_type: searchDto.vehicleType || 'all',
      },
    });
    return result;
  }

  async findOne(
    id: string,
    context?: {
      userId: string | null;
      ip?: string;
      userAgent?: string;
      includeFullVin?: boolean;
      isAdmin?: boolean;
    },
  ): Promise<Listing> {
    try {
      return await this.getListingUseCase.execute(id, context);
    } catch (error) {
      if (!(error instanceof NotFoundException)) {
        this.logger.error('Error in findOne for listing ' + id, error);
      }
      throw error;
    }
  }

  async update(
    id: string,
    updateListingDto: UpdateListingDto,
    userId: string,
    userType?: string,
  ): Promise<Listing> {
    return this.updateListingUseCase.execute(id, updateListingDto, userId, userType);
  }

  async publish(id: string, userId: string): Promise<Listing> {
    return this.publishListingUseCase.execute(id, userId);
  }

  async pause(id: string, userId: string): Promise<Listing> {
    return this.pauseListingUseCase.execute(id, userId);
  }

  async close(id: string, userId: string): Promise<Listing> {
    return this.closeListingUseCase.execute(id, userId);
  }

  async getActiveListingsCount(userId: string): Promise<number> {
    return this.listingRepo.countActiveByUser(userId);
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async autoCloseOldListings(): Promise<{ closed: number }> {
    return this.autoCloseOldListingsUseCase.execute();
  }

  @Cron(CronExpression.EVERY_HOUR)
  async expirePromotions(): Promise<{ expired: number }> {
    return this.expirePromotionsUseCase.execute();
  }

  async getUserListings(
    userId: string,
    page: number = 1,
    limit: number = 20,
    status?: string,
    promoted?: boolean,
    search?: string,
  ) {
    return this.getUserListingsUseCase.execute(userId, page, limit, status, promoted, search);
  }

  async getActiveUserListings(userId: string): Promise<Listing[]> {
    return this.getActiveUserListingsUseCase.execute(userId);
  }

  async getBoardListings(
    boardSlug: string,
    opts: { page: number; limit: number; sortBy: string; sortOrder: 'ASC' | 'DESC' },
  ) {
    return this.getBoardListingsUseCase.execute(boardSlug, opts);
  }

  async refreshAllDates(userId: string): Promise<{ updated: number }> {
    return this.refreshAllDatesUseCase.execute(userId);
  }

  async findByVin(vin: string, excludeId?: string): Promise<Listing[]> {
    return this.findByVinUseCase.execute(vin, excludeId);
  }

  async getListingVin(listingId: string, userId: string, action: string): Promise<{ vin: string }> {
    return this.getListingVinUseCase.execute(listingId, userId, action);
  }

  async getListingHistory(listingId: string): Promise<Listing[]> {
    return this.getListingHistoryUseCase.execute(listingId);
  }

  async getReportUrl(listingId: string, locale?: string): Promise<{ url: string }> {
    return this.getReportUrlUseCase.execute(listingId, locale);
  }

  async closeAllUserListings(userId: string): Promise<number> {
    return this.closeAllUserListingsUseCase.execute(userId);
  }

  async togglePromotion(
    id: string,
    userId: string,
    dto: TogglePromotionDto,
    userType?: string,
  ): Promise<Listing> {
    const days = dto.is_promoted ? (dto.days !== undefined ? dto.days : 7) : null;
    return this.togglePromotionUseCase.execute(id, userId, userType, dto.is_promoted, days);
  }

  async createPromotionHistory(
    listingId: string,
    userId: string,
    listingTitle: string,
    days: number | null,
  ): Promise<void> {
    return this.createPromotionHistoryUseCase.execute(listingId, userId, listingTitle, days);
  }

  async updatePromotionHistoryEndDate(listingId: string): Promise<void> {
    return this.updatePromotionHistoryEndDateUseCase.execute(listingId);
  }

  async getPromotionHistory(userId: string, page: number = 1, limit: number = 50) {
    return this.getPromotionHistoryUseCase.execute(userId, page, limit);
  }

  async hasPromotionHistory(userId: string): Promise<boolean> {
    return this.hasPromotionHistoryUseCase.execute(userId);
  }

  async findSimilar(
    listingId: string,
    limit: number = 4,
    offset: number = 0,
  ): Promise<ListingData[]> {
    return this.findSimilarUseCase.execute(listingId, limit, offset);
  }

  getPromotionAccessStatus(userType?: string) {
    return this.getPromotionAccessUseCase.execute(userType);
  }
}
