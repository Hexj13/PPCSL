import * as crypto from 'crypto';

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, LessThan, LessThanOrEqual, Repository } from 'typeorm';

import { BrandsService } from '../brands/brands.service';
import { BODY_TYPES_BY_VEHICLE_TYPE } from '../common/constants';
import { I18nService } from '../common/i18n/i18n.service';
import { RedisService } from '../common/redis.service';
import { Currency as CurrencyEnum, ListingStatus as ListingStatusEnum } from '../common/types';
import {
  CACHE_PREFIXES,
  CACHE_TTL,
  generateCacheKey,
  generateCacheKeyWithHash,
} from '../common/utils/cache.utils';
import { removePasswordFromUser } from '../common/utils/error-handling.utils';
import { sanitizeHtml } from '../common/utils/html-sanitizer';
import {
  applyBooleanFilter,
  applyCitiesFilter,
  applyInOrEqualFilter,
  applyRangeFilter,
  applyTextSearchFilter,
} from '../common/utils/query-builder.utils';
import { validateRegistrationDate } from '../common/utils/validation.utils';
import { UsersService } from '../users/users.service';

import { CreateListingDto } from './dto/create-listing.dto';
import { SearchListingsDto } from './dto/search-listings.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { ListingView } from './entities/listing-view.entity';
import { Listing } from './entities/listing.entity';
import { PromotionHistory } from './entities/promotion-history.entity';
import { Vehicle } from './entities/vehicle.entity';

interface ListingWithSimilarityMetadata extends Listing {
  __bucket_priority?: number;
  __same_city?: number;
  __mileage_diff?: number;
}

@Injectable()
export class ListingsService {
  private readonly logger = new Logger(ListingsService.name);
  private readonly CACHE_TTL_SEARCH = CACHE_TTL.listings.search;
  private readonly CACHE_TTL_SINGLE = CACHE_TTL.listings.single;
  private readonly CACHE_TTL_USER = CACHE_TTL.listings.userListings;
  private readonly CACHE_TTL_SIMILAR = CACHE_TTL.listings.similar;

  constructor(
    @InjectRepository(Listing)
    private listingsRepository: Repository<Listing>,
    @InjectRepository(Vehicle)
    private vehiclesRepository: Repository<Vehicle>,
    @InjectRepository(ListingView)
    private listingViewsRepository: Repository<ListingView>,
    @InjectRepository(PromotionHistory)
    private promotionHistoryRepository: Repository<PromotionHistory>,
    private usersService: UsersService,
    private brandsService: BrandsService,
    private redisService: RedisService,
    private i18nService: I18nService,
  ) {}

  async create(createListingDto: CreateListingDto, userId: string): Promise<Listing> {
    validateRegistrationDate(createListingDto.registration_expires_at);

    const vehicle = this.vehiclesRepository.create(createListingDto.vehicle);
    const savedVehicle = await this.vehiclesRepository.save(vehicle);

    const title = await this.generateTitle(savedVehicle);

    const status = createListingDto.status || ListingStatusEnum.Active;

    if (status === ListingStatusEnum.Active) {
      const activeCount = await this.getActiveListingsCount(userId);
      const limit = await this.usersService.getListingLimit(userId);

      if (activeCount >= limit) {
        throw new BadRequestException(`errors.activeListingsLimitExceeded|${limit}`);
      }
    }

    const listing = this.listingsRepository.create({
      ...createListingDto,
      description: createListingDto.description
        ? sanitizeHtml(createListingDto.description)
        : undefined,
      title,
      status,
      currency: createListingDto.currency || CurrencyEnum.EUR,
      vehicle_id: savedVehicle.id,
      user_id: userId,
      last_updated_at: new Date(),
      last_published_at: status === ListingStatusEnum.Active ? new Date() : null,
      registration_expires_at: createListingDto.registration_expires_at
        ? new Date(createListingDto.registration_expires_at)
        : null,
    });

    listing.vehicle = savedVehicle;
    const savedListing = await this.listingsRepository.save(listing);

    try {
      await this.redisService.invalidateByPrefix(CACHE_PREFIXES.listingsSearch);
      await this.redisService.del(
        generateCacheKey({ prefix: CACHE_PREFIXES.listings, parts: [savedListing.id] }),
      );
    } catch (_: unknown) {
      void _;
    }

    const Sentry = await import('@sentry/node');
    const vehicleWithModel = await this.vehiclesRepository.findOne({
      where: { id: savedVehicle.id },
      relations: ['model'],
    });
    const vehicle_type =
      vehicleWithModel?.model?.vehicle_type ||
      (savedVehicle.body_type
        ? this.getVehicleTypeFromBodyType(savedVehicle.body_type)
        : undefined) ||
      'unknown';

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
    const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'DESC' } = searchDto;
    const skip = (page - 1) * limit;

    const cacheKey = generateCacheKeyWithHash(CACHE_PREFIXES.listingsSearch, searchDto);
    try {
      const cached = await this.redisService.getJson<{
        data: Listing[];
        meta: { total: number; page: number; limit: number; totalPages: number };
      }>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (_: unknown) {
      void _;
    }

    const queryBuilder = this.listingsRepository
      .createQueryBuilder('listing')
      .select([
        'listing.id',
        'listing.title',
        'listing.price',
        'listing.currency',
        'listing.city',
        'listing.status',
        'listing.images',
        'listing.urgent',
        'listing.is_new',
        'listing.is_promoted',
        'listing.promoted_until',
        'listing.views',
        'listing.condition',
        'listing.registration_type',
        'listing.is_registered',
        'listing.created_at',
        'listing.last_updated_at',
      ])
      .leftJoin('listing.vehicle', 'vehicle')
      .addSelect([
        'vehicle.id',
        'vehicle.year',
        'vehicle.fuel',
        'vehicle.transmission',
        'vehicle.mileage_km',
        'vehicle.body_type',
        'vehicle.engine_displ_l',
        'vehicle.color',
        'vehicle.doors',
        'vehicle.drive_type',
      ])
      .leftJoin('vehicle.brand', 'brand')
      .addSelect(['brand.id', 'brand.name', 'brand.logoUrl'])
      .leftJoin('vehicle.model', 'model')
      .addSelect(['model.id', 'model.name', 'model.vehicle_type'])
      .leftJoin('listing.user', 'user')
      .addSelect([
        'user.id',
        'user.type',
        'user.phone',
        'user.firstName',
        'user.lastName',
        'user.companyName',
        'user.companyWebsiteUrl',
      ])
      .where('listing.status = :status', { status: ListingStatusEnum.Active });

    applyInOrEqualFilter(
      queryBuilder,
      'vehicle',
      'brand_id',
      searchDto.brand_ids,
      searchDto.brand_id,
    );
    applyInOrEqualFilter(
      queryBuilder,
      'vehicle',
      'model_id',
      searchDto.model_ids,
      searchDto.model_id,
    );

    if (searchDto.vehicleType) {
      queryBuilder.andWhere(
        '(model.vehicle_type = :vehicleType OR (model.vehicle_type IS NULL AND vehicle.body_type IN (:...bodyTypes)))',
        {
          vehicleType: searchDto.vehicleType,
          bodyTypes: BODY_TYPES_BY_VEHICLE_TYPE[searchDto.vehicleType],
        },
      );
    }

    applyRangeFilter(queryBuilder, 'vehicle', 'year', searchDto.year_gte, searchDto.year_lte);
    applyRangeFilter(queryBuilder, 'listing', 'price', searchDto.price_gte, searchDto.price_lte);
    applyRangeFilter(
      queryBuilder,
      'vehicle',
      'mileage_km',
      searchDto.mileage_gte,
      searchDto.mileage_lte,
    );
    applyRangeFilter(
      queryBuilder,
      'vehicle',
      'engine_displ_l',
      searchDto.engine_displ_l_gte,
      searchDto.engine_displ_l_lte,
    );
    applyRangeFilter(
      queryBuilder,
      'listing',
      'horsepower',
      searchDto.horsepower_gte,
      searchDto.horsepower_lte,
    );

    applyCitiesFilter(queryBuilder, 'listing', searchDto.cities, searchDto.city);

    applyInOrEqualFilter(queryBuilder, 'vehicle', 'fuel', searchDto.fuels, searchDto.fuel);
    applyInOrEqualFilter(
      queryBuilder,
      'vehicle',
      'transmission',
      searchDto.transmissions,
      searchDto.transmission,
    );
    if (searchDto.body_types && searchDto.body_types.length > 0) {
      queryBuilder.andWhere('vehicle.body_type IN (:...bodyTypes)', {
        bodyTypes: searchDto.body_types,
      });
    } else if (searchDto.body_type) {
      queryBuilder.andWhere('vehicle.body_type = :bodyType', {
        bodyType: searchDto.body_type,
      });
    }
    applyInOrEqualFilter(queryBuilder, 'vehicle', 'color', searchDto.colors, searchDto.color);

    if (searchDto.vehicleType !== 'moto') {
      applyInOrEqualFilter(queryBuilder, 'vehicle', 'drive_type', searchDto.drive_types, undefined);

      if (searchDto.doors && searchDto.doors.length > 0) {
        const doorNumbers = searchDto.doors.map((d) => parseInt(d, 10)).filter((d) => !isNaN(d));
        if (doorNumbers.length > 0) {
          queryBuilder.andWhere('vehicle.doors IN (:...doors)', { doors: doorNumbers });
        }
      } else if (searchDto.doors_single) {
        queryBuilder.andWhere('vehicle.doors = :doors', {
          doors: searchDto.doors_single,
        });
      }
    }

    if (searchDto.currency) {
      queryBuilder.andWhere('listing.currency = :currency', {
        currency: searchDto.currency,
      });
    }

    applyTextSearchFilter(queryBuilder, 'listing', 'title', searchDto.title);

    applyBooleanFilter(queryBuilder, 'listing', 'urgent', searchDto.urgent);
    applyBooleanFilter(queryBuilder, 'listing', 'is_new', searchDto.is_new);
    applyBooleanFilter(queryBuilder, 'listing', 'is_registered', searchDto.is_registered);

    if (searchDto.conditions && searchDto.conditions.length > 0) {
      queryBuilder.andWhere('listing.condition IN (:...conditions)', {
        conditions: searchDto.conditions,
      });
    }

    if (searchDto.registration_types && searchDto.registration_types.length > 0) {
      queryBuilder.andWhere('listing.registration_type IN (:...registration_types)', {
        registration_types: searchDto.registration_types,
      });
    }

    queryBuilder.andWhere(
      '(listing.is_promoted = false OR (listing.is_promoted = true AND (listing.promoted_until IS NULL OR listing.promoted_until > NOW())))',
    );

    const validSortFields = ['created_at', 'price', 'year', 'views'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    queryBuilder.orderBy('listing.is_promoted', 'DESC');

    if (sortField === 'year') {
      queryBuilder.addOrderBy('vehicle.year', order);
    } else if (sortField === 'views') {
      queryBuilder.addOrderBy('listing.views', order);
    } else {
      queryBuilder.addOrderBy(`listing.${sortField}`, order);
    }

    const [listings, total] = await queryBuilder.skip(skip).take(limit).getManyAndCount();

    const listingsWithoutPasswords = listings.map((listing) => {
      if (listing.user) {
        listing.user = removePasswordFromUser(listing.user) as typeof listing.user;

        if (
          listing.status === ListingStatusEnum.Closed ||
          (!listing.user.email && !listing.user.phone)
        ) {
          listing.user.phone = null;
          listing.user.email = null;
          listing.user.firstName = null;
          listing.user.lastName = null;
          listing.user.companyName = null;
          listing.user.companyWebsiteUrl = null;
        }
      }
      return listing;
    });

    const result = {
      data: listingsWithoutPasswords,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    try {
      await this.redisService.setJson(cacheKey, result, this.CACHE_TTL_SEARCH);
    } catch (_: unknown) {
      void _;
    }

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
        results_count: total,
        page: page,
        vehicle_type: searchDto.vehicleType || 'all',
      },
    });

    return result;
  }

  async findOne(id: string): Promise<Listing> {
    try {
      await this.listingsRepository.manager.connection.queryResultCache?.remove([`listing_${id}`]);

      const listing = await this.listingsRepository
        .createQueryBuilder('listing')
        .leftJoinAndSelect('listing.vehicle', 'vehicle')
        .leftJoinAndSelect('vehicle.brand', 'brand')
        .leftJoinAndSelect('vehicle.model', 'model')
        .leftJoinAndSelect('listing.user', 'user')
        .where('listing.id = :id', { id })
        .getOne();

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
          listing.user.board_slug = await this.usersService.ensureBoardSlug(listing.user_id);
        }
      }

      if (listing.status === ListingStatusEnum.Closed) {
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

      return listing;
    } catch (error) {
      if (!(error instanceof NotFoundException)) {
        this.logger.error(`Error in findOne for listing ${id}:`, error);
      }
      throw error;
    }
  }

  async recordView(
    listingId: string,
    userId: string | null,
    visitorId: string | null,
  ): Promise<void> {
    if (!userId && !visitorId) {
      return;
    }

    const listing = await this.listingsRepository.findOne({
      where: { id: listingId },
      select: ['id', 'user_id'],
    });
    if (!listing) {
      return;
    }

    if (userId && listing.user_id && userId === listing.user_id) {
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

  generateVisitorId(ip: string, userAgent: string): string {
    return crypto.createHash('sha256').update(`${ip}:${userAgent}`).digest('hex');
  }

  private async generateTitle(vehicle: Vehicle, locale?: string): Promise<string> {
    const brand = vehicle.brand_id ? await this.brandsService.findOne(vehicle.brand_id) : null;
    const models = brand ? await this.brandsService.getModelsByBrand(vehicle.brand_id) : [];
    const model = models.find((m) => m.id === vehicle.model_id);

    const titleParts: string[] = [];
    if (brand) titleParts.push(brand.name);
    if (model) titleParts.push(model.name);
    if (vehicle.year) titleParts.push(vehicle.year.toString());

    const baseTitle = titleParts.join(' ');

    if (model?.vehicle_type === 'moto') {
      return baseTitle;
    }

    if (vehicle.transmission) {
      const transmissionKey = `vehicleOptions.transmission.${vehicle.transmission}`;
      const transmissionStr = this.i18nService.translate(transmissionKey, locale);
      if (transmissionStr && transmissionStr !== transmissionKey) {
        return `${baseTitle} (${transmissionStr})`;
      }
    }

    return baseTitle;
  }

  async update(id: string, updateListingDto: UpdateListingDto, userId: string): Promise<Listing> {
    validateRegistrationDate(updateListingDto.registration_expires_at);

    const listing = await this.listingsRepository.findOne({
      where: { id },
      relations: ['vehicle'],
    });

    if (!listing) {
      throw new NotFoundException('errors.listingNotFound');
    }

    if (listing.user_id !== userId) {
      throw new ForbiddenException('errors.listingAccessDenied');
    }

    if (listing.status === 'Closed') {
      throw new BadRequestException('errors.cannotEditClosedListing');
    }

    const previousBrandId = listing.vehicle?.brand_id;

    if (updateListingDto.vehicle && listing.vehicle_id) {
      const vehicleUpdateData: Partial<Vehicle> = {};
      const vehicleDto = updateListingDto.vehicle;

      if (vehicleDto.brand_id !== undefined) vehicleUpdateData.brand_id = vehicleDto.brand_id;
      if (vehicleDto.model_id !== undefined) vehicleUpdateData.model_id = vehicleDto.model_id;
      if (vehicleDto.year !== undefined) vehicleUpdateData.year = vehicleDto.year;
      if (vehicleDto.engine_displ_l !== undefined)
        vehicleUpdateData.engine_displ_l = vehicleDto.engine_displ_l;
      if (vehicleDto.mileage_km !== undefined) vehicleUpdateData.mileage_km = vehicleDto.mileage_km;
      if (vehicleDto.fuel !== undefined) vehicleUpdateData.fuel = vehicleDto.fuel;
      if (vehicleDto.transmission !== undefined)
        vehicleUpdateData.transmission = vehicleDto.transmission;
      if (vehicleDto.drive_type !== undefined) vehicleUpdateData.drive_type = vehicleDto.drive_type;
      if (vehicleDto.body_type !== undefined) vehicleUpdateData.body_type = vehicleDto.body_type;
      if (vehicleDto.color !== undefined) vehicleUpdateData.color = vehicleDto.color;
      if (vehicleDto.doors !== undefined) vehicleUpdateData.doors = vehicleDto.doors;

      if (Object.keys(vehicleUpdateData).length > 0) {
        await this.vehiclesRepository.update(listing.vehicle_id, vehicleUpdateData);

        await this.vehiclesRepository.manager.connection.queryResultCache?.remove([
          `vehicle_${listing.vehicle_id}`,
        ]);
      }
    }

    if (!listing.vehicle_id) {
      throw new NotFoundException('errors.vehicleIdNotFound');
    }
    const updatedVehicle = await this.vehiclesRepository.findOne({
      where: { id: listing.vehicle_id },
      relations: ['brand', 'model'],
    });

    if (!updatedVehicle) {
      throw new NotFoundException('errors.vehicleNotFound');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { vehicle, registration_expires_at, ...listingFields } = updateListingDto;
    const listingUpdateData: Partial<Listing> = {
      ...listingFields,
      description: listingFields.description
        ? sanitizeHtml(listingFields.description)
        : listingFields.description,
      last_edited_at: new Date(),
      title: await this.generateTitle(updatedVehicle),
    };

    if (registration_expires_at !== undefined) {
      listingUpdateData.registration_expires_at =
        registration_expires_at === null ? null : new Date(registration_expires_at);
    }

    await this.listingsRepository.update(id, listingUpdateData);

    await this.listingsRepository.manager.connection.queryResultCache?.remove([`listing_${id}`]);

    const freshListing = await this.listingsRepository.findOne({
      where: { id },
      relations: ['vehicle', 'vehicle.brand', 'vehicle.model', 'user'],
    });

    if (!freshListing) {
      throw new NotFoundException('errors.listingNotFound');
    }

    try {
      await this.redisService.invalidateByPrefix(CACHE_PREFIXES.listingsSearch);
      await this.redisService.del(
        generateCacheKey({ prefix: CACHE_PREFIXES.listings, parts: [id] }),
      );

      if (previousBrandId) {
        await this.redisService.del(
          generateCacheKey({ prefix: CACHE_PREFIXES.brandsModels, parts: [previousBrandId] }),
        );
      }
      if (updatedVehicle.brand_id && updatedVehicle.brand_id !== previousBrandId) {
        await this.redisService.del(
          generateCacheKey({
            prefix: CACHE_PREFIXES.brandsModels,
            parts: [updatedVehicle.brand_id],
          }),
        );
      }
    } catch (_: unknown) {
      void _;
    }

    if (freshListing.user) {
      freshListing.user = removePasswordFromUser(freshListing.user) as typeof freshListing.user;
    }

    return freshListing;
  }

  async publish(id: string, userId: string): Promise<Listing> {
    const listing = await this.findOne(id);
    if (listing.user_id !== userId) {
      throw new ForbiddenException('errors.listingAccessDenied');
    }

    const activeCount = await this.getActiveListingsCount(userId);
    const limit = await this.usersService.getListingLimit(userId);

    if (listing.status === ListingStatusEnum.Active) {
      throw new BadRequestException('errors.listingAlreadyActive');
    }

    if (activeCount >= limit) {
      throw new BadRequestException(`errors.activeListingsLimitExceeded|${limit}`);
    }

    if (listing.is_promoted && listing.promoted_until && listing.promoted_paused_at) {
      const now = new Date();
      const pausedMs = now.getTime() - listing.promoted_paused_at.getTime();
      listing.promoted_until = new Date(listing.promoted_until.getTime() + pausedMs);
      listing.promoted_paused_at = null;
    }

    if (listing.is_promoted && listing.promoted_until && !listing.promoted_paused_at) {
      const now = new Date();
      if (listing.promoted_until < now) {
        listing.is_promoted = false;
        listing.promoted_until = null;
        listing.promoted_started_at = null;
        listing.promoted_paused_at = null;
      }
    }

    listing.status = ListingStatusEnum.Active;
    listing.last_published_at = new Date();
    const publishedListing = await this.listingsRepository.save(listing);

    try {
      await this.redisService.invalidateByPrefix(CACHE_PREFIXES.listingsSearch);
      await this.redisService.del(
        generateCacheKey({ prefix: CACHE_PREFIXES.listings, parts: [id] }),
      );
    } catch (_: unknown) {
      void _;
    }

    return publishedListing;
  }

  async pause(id: string, userId: string): Promise<Listing> {
    const listing = await this.findOne(id);
    if (listing.user_id !== userId) {
      throw new ForbiddenException('errors.listingAccessDenied');
    }

    if (listing.is_promoted && listing.promoted_until && !listing.promoted_paused_at) {
      listing.promoted_paused_at = new Date();
    }

    listing.status = ListingStatusEnum.Paused;
    const pausedListing = await this.listingsRepository.save(listing);

    try {
      await this.redisService.invalidateByPrefix(CACHE_PREFIXES.listingsSearch);
      await this.redisService.del(
        generateCacheKey({ prefix: CACHE_PREFIXES.listings, parts: [id] }),
      );
    } catch (_: unknown) {
      void _;
    }

    return pausedListing;
  }

  async close(id: string, userId: string): Promise<Listing> {
    const listing = await this.findOne(id);
    if (listing.user_id !== userId) {
      throw new ForbiddenException('errors.listingAccessDenied');
    }

    const wasPromoted = listing.is_promoted;

    listing.status = ListingStatusEnum.Closed;
    listing.closed_at = new Date();
    listing.is_promoted = false;
    listing.promoted_until = null;
    listing.promoted_started_at = null;
    listing.promoted_paused_at = null;

    const closedListing = await this.listingsRepository.save(listing);

    if (wasPromoted) {
      await this.updatePromotionHistoryEndDate(id);
    }

    try {
      await this.redisService.invalidateByPrefix(CACHE_PREFIXES.listingsSearch);
      await this.redisService.del(
        generateCacheKey({ prefix: CACHE_PREFIXES.listings, parts: [id] }),
      );
    } catch (_: unknown) {
      void _;
    }

    return closedListing;
  }

  async getActiveListingsCount(userId: string): Promise<number> {
    return this.listingsRepository.count({
      where: {
        user_id: userId,
        status: ListingStatusEnum.Active,
      },
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async autoCloseOldListings(): Promise<{ closed: number }> {
    const Sentry = await import('@sentry/node');
    return Sentry.withMonitor(
      'auto-close-old-listings',
      async () => {
        const fiveMonthsAgo = new Date();
        fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 5);
        const now = new Date();
        const closedAt = new Date();

        const promotedListingsWithExpiredPromo = await this.listingsRepository.find({
          where: {
            status: ListingStatusEnum.Active,
            last_updated_at: LessThanOrEqual(fiveMonthsAgo),
            is_promoted: true,
            promoted_until: LessThan(now),
          },
          select: ['id'],
        });

        for (const listing of promotedListingsWithExpiredPromo) {
          await this.updatePromotionHistoryEndDate(listing.id);
        }

        const result = await this.listingsRepository
          .createQueryBuilder()
          .update(Listing)
          .set({
            status: ListingStatusEnum.Closed,
            closed_at: closedAt,
            is_promoted: false,
            promoted_until: null,
            promoted_started_at: null,
            promoted_paused_at: null,
          })
          .where('status = :status', { status: ListingStatusEnum.Active })
          .andWhere('last_updated_at <= :fiveMonthsAgo', { fiveMonthsAgo })
          .andWhere(
            '(is_promoted = false OR (is_promoted = true AND promoted_until IS NOT NULL AND promoted_until < :now))',
            { now },
          )
          .execute();

        this.logger.log(`Auto-closed ${result.affected || 0} old listings`);
        return { closed: result.affected || 0 };
      },
      {
        schedule: {
          type: 'crontab',
          value: '0 0 * * *',
        },
        checkinMargin: 5,
        maxRuntime: 30,
      },
    );
  }

  async getUserListings(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: Listing[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      last_listing_refresh_at: string | null;
    };
  }> {
    const skip = (page - 1) * limit;
    const [listings, total] = await this.listingsRepository.findAndCount({
      where: { user_id: userId },
      relations: ['vehicle', 'vehicle.brand', 'vehicle.model'],
      order: { created_at: 'DESC' },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);
    const lastRefresh = await this.usersService.getLastListingRefreshAt(userId);

    return {
      data: listings,
      meta: {
        total,
        page,
        limit,
        totalPages,
        last_listing_refresh_at: lastRefresh ? lastRefresh.toISOString() : null,
      },
    };
  }

  async getActiveUserListings(userId: string): Promise<Listing[]> {
    return this.listingsRepository.find({
      where: { user_id: userId, status: ListingStatusEnum.Active },
      relations: ['vehicle', 'vehicle.brand', 'vehicle.model'],
      order: { is_promoted: 'DESC', created_at: 'DESC' },
    });
  }

  async getBoardListings(
    boardSlug: string,
    opts: {
      page: number;
      limit: number;
      sortBy: string;
      sortOrder: 'ASC' | 'DESC';
    },
  ): Promise<{
    data: Listing[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const user = await this.usersService.findByBoardSlug(boardSlug);
    if (!user) {
      throw new NotFoundException('errors.boardNotFound');
    }
    const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'DESC' } = opts;
    const validSortFields = ['created_at', 'price', 'year', 'views'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder === 'ASC' ? 'ASC' : 'DESC';
    const skip = (page - 1) * limit;

    const queryBuilder = this.listingsRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.vehicle', 'vehicle')
      .leftJoinAndSelect('vehicle.brand', 'brand')
      .leftJoinAndSelect('vehicle.model', 'model')
      .leftJoinAndSelect('listing.user', 'user')
      .where('listing.user_id = :userId', { userId: user.id })
      .andWhere('listing.status = :status', { status: ListingStatusEnum.Active })
      .orderBy('listing.is_promoted', 'DESC');

    if (sortField === 'year') {
      queryBuilder.addOrderBy('vehicle.year', order);
    } else if (sortField === 'views') {
      queryBuilder.addOrderBy('listing.views', order);
    } else {
      queryBuilder.addOrderBy(`listing.${sortField}`, order);
    }

    const [listings, total] = await queryBuilder.skip(skip).take(limit).getManyAndCount();

    const listingsWithoutPasswords = listings.map((listing) => {
      if (listing.user) {
        listing.user = removePasswordFromUser(listing.user) as typeof listing.user;
      }
      return listing;
    });

    return {
      data: listingsWithoutPasswords,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async refreshAllDates(userId: string): Promise<{ updated: number }> {
    const now = new Date();
    const lastRefresh = await this.usersService.getLastListingRefreshAt(userId);
    if (lastRefresh) {
      const elapsed = now.getTime() - lastRefresh.getTime();
      const fortyEightHoursMs = 48 * 60 * 60 * 1000;
      if (elapsed < fortyEightHoursMs) {
        throw new BadRequestException('errors.refreshDatesTooSoon');
      }
    }
    const result = await this.listingsRepository.update(
      { user_id: userId, status: ListingStatusEnum.Active },
      { last_updated_at: now },
    );
    await this.usersService.update(userId, { last_listing_refresh_at: now });
    return { updated: result.affected || 0 };
  }

  async findByVin(vin: string, excludeId?: string): Promise<Listing[]> {
    const queryBuilder = this.listingsRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.vehicle', 'vehicle')
      .leftJoinAndSelect('vehicle.brand', 'brand')
      .leftJoinAndSelect('vehicle.model', 'model')
      .where('listing.vin = :vin', { vin })
      .andWhere('listing.status = :status', { status: ListingStatusEnum.Closed })
      .orderBy('listing.updated_at', 'DESC');

    if (excludeId) {
      queryBuilder.andWhere('listing.id != :excludeId', { excludeId });
    }

    const listings = await queryBuilder.getMany();

    return listings.map((listing) => {
      (listing as Partial<Listing>).price = undefined;
      (listing as Partial<Listing>).currency = undefined;
      if (listing.user) {
        listing.user = removePasswordFromUser(listing.user) as typeof listing.user;
        listing.user.phone = null;
        listing.user.email = null;
        listing.user.firstName = null;
        listing.user.lastName = null;
        listing.user.companyName = null;
        listing.user.companyWebsiteUrl = null;
      }
      return listing;
    });
  }

  async closeAllUserListings(userId: string): Promise<number> {
    const promotedListings = await this.listingsRepository.find({
      where: {
        user_id: userId,
        status: In([ListingStatusEnum.Active, ListingStatusEnum.Paused]),
        is_promoted: true,
      },
      select: ['id'],
    });

    for (const listing of promotedListings) {
      await this.updatePromotionHistoryEndDate(listing.id);
    }

    const closedAt = new Date();
    const result = await this.listingsRepository.update(
      {
        user_id: userId,
        status: In([ListingStatusEnum.Active, ListingStatusEnum.Paused]),
      },
      {
        status: ListingStatusEnum.Closed,
        closed_at: closedAt,
        is_promoted: false,
        promoted_until: null,
        promoted_started_at: null,
        promoted_paused_at: null,
      },
    );

    try {
      await this.redisService.delPattern('cache:listings:search:*');
    } catch (_: unknown) {
      void _;
    }

    return result.affected || 0;
  }

  async togglePromotion(
    id: string,
    userId: string,
    isPromoted: boolean,
    days: number | null,
  ): Promise<Listing> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new BadRequestException('errors.invalidListingId');
    }

    const listing = await this.listingsRepository.findOne({
      where: { id, user_id: userId },
    });

    if (!listing) {
      throw new NotFoundException('errors.listingNotFound');
    }

    if (listing.user_id !== userId) {
      throw new ForbiddenException('errors.listingAccessDenied');
    }

    if (isPromoted && listing.status !== ListingStatusEnum.Active) {
      throw new BadRequestException('errors.promotionOnlyActive');
    }

    const validDays = [1, 7, 14, 30];
    if (isPromoted && days !== null && !validDays.includes(days)) {
      throw new BadRequestException('errors.invalidPromotionPeriod');
    }

    const wasPromoted = listing.is_promoted;

    if (isPromoted && !wasPromoted) {
      const activePromotionsCount = await this.listingsRepository.count({
        where: { user_id: userId, is_promoted: true, status: ListingStatusEnum.Active },
      });

      const MAX_PROMOTIONS_PER_USER = parseInt(process.env.MAX_PROMOTIONS_PER_USER || '10', 10);
      if (activePromotionsCount >= MAX_PROMOTIONS_PER_USER) {
        throw new BadRequestException(`errors.maxPromotionsReached|${MAX_PROMOTIONS_PER_USER}`);
      }
    }
    listing.is_promoted = isPromoted;

    if (isPromoted) {
      const now = new Date();
      listing.promoted_started_at = now;
      listing.promoted_paused_at = null;
      if (days === null) {
        listing.promoted_until = null;
      } else {
        const until = new Date();
        until.setDate(until.getDate() + days);
        listing.promoted_until = until;
      }

      await this.createPromotionHistory(listing.id, userId, listing.title, days);
    } else if (wasPromoted) {
      listing.promoted_until = null;
      listing.promoted_started_at = null;
      listing.promoted_paused_at = null;
      await this.updatePromotionHistoryEndDate(listing.id);
    } else {
      listing.promoted_until = null;
      listing.promoted_started_at = null;
      listing.promoted_paused_at = null;
    }

    const savedListing = await this.listingsRepository.save(listing);

    try {
      await this.redisService.invalidateByPrefix(CACHE_PREFIXES.listingsSearch);
      await this.redisService.del(
        generateCacheKey({ prefix: CACHE_PREFIXES.listings, parts: [id] }),
      );
    } catch (_: unknown) {
      void _;
    }

    return savedListing;
  }

  async createPromotionHistory(
    listingId: string,
    userId: string,
    listingTitle: string,
    days: number | null,
  ): Promise<void> {
    await this.promotionHistoryRepository.save({
      listing_id: listingId,
      user_id: userId,
      listing_title: listingTitle,
      started_at: new Date(),
      ended_at: null,
      days,
    });
  }

  async updatePromotionHistoryEndDate(listingId: string): Promise<void> {
    const lastHistory = await this.promotionHistoryRepository.findOne({
      where: { listing_id: listingId, ended_at: IsNull() },
      order: { started_at: 'DESC' },
    });

    if (lastHistory) {
      lastHistory.ended_at = new Date();
      await this.promotionHistoryRepository.save(lastHistory);
    }
  }

  async getPromotionHistory(
    userId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{
    data: Array<PromotionHistory & { listing_status?: ListingStatusEnum; listing_id: string }>;
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const skip = (page - 1) * limit;

    const [history, total] = await this.promotionHistoryRepository
      .createQueryBuilder('ph')
      .leftJoinAndSelect('ph.listing', 'listing')
      .where('ph.user_id = :userId', { userId })
      .orderBy('ph.started_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const historyWithStatus = history.map((item) => ({
      ...item,
      listing_status: item.listing?.status || null,
    }));

    return {
      data: historyWithStatus,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async hasPromotionHistory(userId: string): Promise<boolean> {
    const count = await this.promotionHistoryRepository.count({
      where: { user_id: userId },
    });
    return count > 0;
  }

  async findSimilar(listingId: string, limit: number = 4, offset: number = 0): Promise<Listing[]> {
    const normalizedLimit = Math.min(Math.max(1, limit || 4), 8);
    const normalizedOffset = Math.max(0, offset || 0);

    const current = await this.findOne(listingId);
    if (!current || current.status !== ListingStatusEnum.Active) {
      return [];
    }

    const cacheKey = generateCacheKey({
      prefix: CACHE_PREFIXES.listingsSimilar,
      parts: [listingId],
    });

    try {
      const cached = await this.redisService.getJson<Listing[]>(cacheKey);
      if (cached) {
        return cached.slice(normalizedOffset, normalizedOffset + normalizedLimit);
      }
    } catch (_: unknown) {
      void _;
    }

    const candidates = await this.fetchSimilarCandidates(current);
    const uniqueSellers = new Set(candidates.map((l) => l.user_id)).size;
    const maxPerSeller = uniqueSellers <= 2 ? 8 : 2;
    const diversified = this.applySellerDiversification(candidates, maxPerSeller);
    const result = diversified.slice(0, 8);

    try {
      await this.redisService.setJson(cacheKey, result, this.CACHE_TTL_SIMILAR);
    } catch (_: unknown) {
      void _;
    }

    return result.slice(normalizedOffset, normalizedOffset + normalizedLimit);
  }

  private getVehicleTypeFromBodyType(
    bodyType: string | null,
  ): 'car' | 'truck' | 'moto' | undefined {
    if (!bodyType) {
      return undefined;
    }

    for (const [vehicleType, bodyTypes] of Object.entries(BODY_TYPES_BY_VEHICLE_TYPE)) {
      if ((bodyTypes as readonly string[]).includes(bodyType)) {
        return vehicleType as 'car' | 'truck' | 'moto';
      }
    }
    return undefined;
  }

  private async fetchSimilarCandidates(current: Listing): Promise<Listing[]> {
    const { vehicle } = current;
    const { price, city, id: currentId } = current;

    const year = vehicle?.year;
    const mileage = vehicle?.mileage_km;
    const body_type = vehicle?.body_type;
    const brand_id = vehicle?.brand_id;
    const model_id = vehicle?.model_id;
    let vehicle_type = vehicle?.model?.vehicle_type;

    if (!vehicle_type && body_type) {
      vehicle_type = this.getVehicleTypeFromBodyType(body_type);
    }

    // Адаптивные диапазоны года: старые машины - ±3 года, новые - ±5 лет
    const yearRange = year && year < 2010 ? 3 : 5;
    const yearMin = year ? year - yearRange : null;
    const yearMax = year ? year + yearRange : null;

    // Адаптивные диапазоны цены: дешёвые машины - ±30%, дорогие - ±60%
    const priceRange = price && price < 10000 ? 0.3 : 0.6;
    const priceMin = price ? price * (1 - priceRange) : null;
    const priceMax = price ? price * (1 + priceRange) : null;

    const queryBuilder = this.listingsRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.vehicle', 'vehicle')
      .leftJoinAndSelect('vehicle.brand', 'brand')
      .leftJoinAndSelect('vehicle.model', 'model')
      .leftJoinAndSelect('listing.user', 'user')
      .where('listing.status = :status', { status: ListingStatusEnum.Active })
      .andWhere('listing.id != :currentId', { currentId });

    if (vehicle_type) {
      queryBuilder.andWhere(
        '(model.vehicle_type = :vehicle_type OR (model.vehicle_type IS NULL AND vehicle.body_type IN (:...bodyTypes)))',
        {
          vehicle_type,
          bodyTypes: BODY_TYPES_BY_VEHICLE_TYPE[vehicle_type],
        },
      );
    }

    queryBuilder.limit(100);

    const listings = await queryBuilder.getMany();

    const currentCityNormalized = city ? city.trim().toLowerCase() : '';

    const listingsWithMetadata = listings.map((listing): ListingWithSimilarityMetadata => {
      const v = listing.vehicle;
      let bucketPriority = 6;

      if (v && brand_id && model_id && v.brand_id === brand_id && v.model_id === model_id) {
        if (
          yearMin !== null &&
          yearMax !== null &&
          v.year &&
          v.year >= yearMin &&
          v.year <= yearMax
        ) {
          bucketPriority = 1;
        }
      }

      if (
        bucketPriority === 6 &&
        v &&
        brand_id &&
        body_type &&
        v.brand_id === brand_id &&
        v.body_type === body_type
      ) {
        if (
          yearMin !== null &&
          yearMax !== null &&
          v.year &&
          v.year >= yearMin &&
          v.year <= yearMax &&
          priceMin !== null &&
          priceMax !== null &&
          listing.price >= priceMin &&
          listing.price <= priceMax
        ) {
          bucketPriority = 2;
        }
      }

      if (bucketPriority === 6 && v && body_type && v.body_type === body_type) {
        if (
          yearMin !== null &&
          yearMax !== null &&
          v.year &&
          v.year >= yearMin &&
          v.year <= yearMax &&
          priceMin !== null &&
          priceMax !== null &&
          listing.price >= priceMin &&
          listing.price <= priceMax
        ) {
          bucketPriority = 3;
        } else if (
          priceMin !== null &&
          priceMax !== null &&
          listing.price >= priceMin &&
          listing.price <= priceMax
        ) {
          bucketPriority = 4;
        }
      }

      if (
        bucketPriority === 6 &&
        v &&
        yearMin !== null &&
        yearMax !== null &&
        v.year &&
        v.year >= yearMin &&
        v.year <= yearMax &&
        priceMin !== null &&
        priceMax !== null &&
        listing.price >= priceMin &&
        listing.price <= priceMax
      ) {
        bucketPriority = 5;
      }

      const listingCityNormalized = listing.city ? listing.city.trim().toLowerCase() : '';
      const sameCity = listingCityNormalized === currentCityNormalized ? 1 : 0;

      let mileageDiff = Infinity;
      if (mileage && v?.mileage_km) {
        mileageDiff = Math.abs(v.mileage_km - mileage);
      }

      const listingWithMetadata: ListingWithSimilarityMetadata = {
        ...listing,
        __bucket_priority: bucketPriority,
        __same_city: sameCity,
        __mileage_diff: mileageDiff,
      };

      return listingWithMetadata;
    });

    const now = new Date();
    listingsWithMetadata.sort((a, b) => {
      const priorityA = a.__bucket_priority ?? 999;
      const priorityB = b.__bucket_priority ?? 999;
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      const isActivelyPromotedA =
        a.is_promoted && (!a.promoted_until || new Date(a.promoted_until) > now);
      const isActivelyPromotedB =
        b.is_promoted && (!b.promoted_until || new Date(b.promoted_until) > now);
      const promotedA = isActivelyPromotedA ? 1 : 0;
      const promotedB = isActivelyPromotedB ? 1 : 0;
      if (promotedA !== promotedB) {
        return promotedB - promotedA;
      }

      const sameCityA = a.__same_city ?? 0;
      const sameCityB = b.__same_city ?? 0;
      if (sameCityA !== sameCityB) {
        return sameCityB - sameCityA;
      }

      const mileageDiffA = a.__mileage_diff ?? Infinity;
      const mileageDiffB = b.__mileage_diff ?? Infinity;
      if (mileageDiffA !== mileageDiffB) {
        return mileageDiffA - mileageDiffB;
      }

      return new Date(b.last_updated_at).getTime() - new Date(a.last_updated_at).getTime();
    });

    return listingsWithMetadata.map(
      ({ __bucket_priority, __same_city, __mileage_diff, ...listing }) => listing,
    );
  }

  private applySellerDiversification(listings: Listing[], maxPerSeller: number): Listing[] {
    const sellerCount = new Map<string, number>();
    const result: Listing[] = [];

    for (const listing of listings) {
      const sellerId = listing.user_id;
      const count = sellerCount.get(sellerId) || 0;

      if (count < maxPerSeller) {
        result.push(listing);
        sellerCount.set(sellerId, count + 1);
      }

      if (result.length >= 8) {
        break;
      }
    }

    return result;
  }
}
