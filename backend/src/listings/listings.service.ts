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

@Injectable()
export class ListingsService {
  private readonly logger = new Logger(ListingsService.name);
  private readonly CACHE_TTL_SEARCH = CACHE_TTL.listings.search;
  private readonly CACHE_TTL_SINGLE = CACHE_TTL.listings.single;
  private readonly CACHE_TTL_USER = CACHE_TTL.listings.userListings;

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
      currency: createListingDto.currency || CurrencyEnum.MKD,
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
    } catch {
      // Ignore cache errors
    }

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
    } catch {
      // Ignore cache errors
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
      .addSelect(['model.id', 'model.name'])
      .leftJoin('listing.user', 'user')
      .addSelect([
        'user.id',
        'user.type',
        'user.phone',
        'user.firstName',
        'user.lastName',
        'user.companyName',
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
    applyInOrEqualFilter(
      queryBuilder,
      'vehicle',
      'body_type',
      searchDto.body_types,
      searchDto.body_type,
    );
    applyInOrEqualFilter(queryBuilder, 'vehicle', 'color', searchDto.colors, searchDto.color);
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
    } catch {
      // Ignore cache errors
    }

    return result;
  }

  async findOne(id: string): Promise<Listing> {
    try {
      // Clear cache before loading to ensure fresh data
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
        throw new NotFoundException('Vehicle not found for listing');
      }

      if (listing.user) {
        listing.user = removePasswordFromUser(listing.user) as typeof listing.user;
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
        }
      }

      if (listing.user && !listing.user.email && !listing.user.phone) {
        listing.user.phone = null;
        listing.user.email = null;
        listing.user.firstName = null;
        listing.user.lastName = null;
        listing.user.companyName = null;
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

  private async generateTitle(vehicle: Vehicle): Promise<string> {
    const brand = vehicle.brand_id ? await this.brandsService.findOne(vehicle.brand_id) : null;
    const models = brand ? await this.brandsService.getModelsByBrand(vehicle.brand_id) : [];
    const model = models.find((m) => m.id === vehicle.model_id);

    const titleParts: string[] = [];
    if (brand) titleParts.push(brand.name);
    if (model) titleParts.push(model.name);
    if (vehicle.year) titleParts.push(vehicle.year.toString());

    const transmissionMap: Record<string, string> = {
      Automatic: 'Автоматска',
      Manual: 'Мануелна',
      CVT: 'Варијатор',
    };

    const transmissionStr = vehicle.transmission ? transmissionMap[vehicle.transmission] || '' : '';

    const baseTitle = titleParts.join(' ');
    return transmissionStr ? `${baseTitle} (${transmissionStr})` : baseTitle;
  }

  async update(id: string, updateListingDto: UpdateListingDto, userId: string): Promise<Listing> {
    validateRegistrationDate(updateListingDto.registration_expires_at);

    // Load current listing
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

    // Update vehicle if needed
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

        // Clear TypeORM cache
        await this.vehiclesRepository.manager.connection.queryResultCache?.remove([
          `vehicle_${listing.vehicle_id}`,
        ]);
      }
    }

    // Load updated vehicle for title generation
    if (!listing.vehicle_id) {
      throw new NotFoundException('Vehicle ID not found');
    }
    const updatedVehicle = await this.vehiclesRepository.findOne({
      where: { id: listing.vehicle_id },
      relations: ['brand', 'model'],
    });

    if (!updatedVehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    // Prepare listing update data
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

    // Update listing
    await this.listingsRepository.update(id, listingUpdateData);

    // Clear TypeORM cache for listing
    await this.listingsRepository.manager.connection.queryResultCache?.remove([`listing_${id}`]);

    // Load fresh listing with all relations
    const freshListing = await this.listingsRepository.findOne({
      where: { id },
      relations: ['vehicle', 'vehicle.brand', 'vehicle.model', 'user'],
    });

    if (!freshListing) {
      throw new NotFoundException('errors.listingNotFound');
    }

    // Clear Redis cache
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
    } catch {
      // Ignore cache errors
    }

    // Remove sensitive user data
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
    } catch {
      // Ignore cache errors
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
    } catch {
      // Ignore cache errors
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
    } catch {
      // Ignore cache errors
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
  }

  async getUserListings(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: Listing[];
    meta: { total: number; page: number; limit: number; totalPages: number };
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

    return {
      data: listings,
      meta: {
        total,
        page,
        limit,
        totalPages,
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

  async refreshAllDates(userId: string): Promise<{ updated: number }> {
    const now = new Date();
    const result = await this.listingsRepository.update(
      { user_id: userId, status: ListingStatusEnum.Active },
      { last_updated_at: now },
    );
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
    } catch {
      // Ignore cache errors
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
    } catch {
      // Ignore cache errors
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
}
