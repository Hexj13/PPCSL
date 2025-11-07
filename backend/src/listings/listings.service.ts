import * as crypto from 'crypto';

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';

import { BrandsService } from '../brands/brands.service';
import { RedisService } from '../common/redis.service';
import { Currency as CurrencyEnum, ListingStatus as ListingStatusEnum } from '../common/types';
import { UsersService } from '../users/users.service';

import { CreateListingDto } from './dto/create-listing.dto';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { SearchListingsDto } from './dto/search-listings.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { ListingView } from './entities/listing-view.entity';
import { Listing } from './entities/listing.entity';
import { Vehicle } from './entities/vehicle.entity';

@Injectable()
export class ListingsService {
  private readonly CACHE_TTL = 300;

  constructor(
    @InjectRepository(Listing)
    private listingsRepository: Repository<Listing>,
    @InjectRepository(Vehicle)
    private vehiclesRepository: Repository<Vehicle>,
    @InjectRepository(ListingView)
    private listingViewsRepository: Repository<ListingView>,
    private usersService: UsersService,
    private brandsService: BrandsService,
    private redisService: RedisService,
  ) {}

  async create(createListingDto: CreateListingDto, userId: string): Promise<Listing> {
    if (createListingDto.registration_expires_at) {
      const registrationDate = new Date(createListingDto.registration_expires_at);
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      const registrationMonth = registrationDate.getMonth();
      const registrationYear = registrationDate.getFullYear();

      if (
        registrationYear < currentYear ||
        (registrationYear === currentYear && registrationMonth < currentMonth)
      ) {
        throw new BadRequestException(
          'Датата на регистрација не може да биде помала од тековниот месец и година',
        );
      }
    }

    const vehicle = this.vehiclesRepository.create(createListingDto.vehicle);
    const savedVehicle = await this.vehiclesRepository.save(vehicle);

    const title = await this.generateTitle(savedVehicle);

    const status = createListingDto.status || ListingStatusEnum.Active;

    if (status === ListingStatusEnum.Active) {
      const activeCount = await this.getActiveListingsCount(userId);
      const limit = await this.usersService.getListingLimit(userId);

      if (activeCount >= limit) {
        throw new BadRequestException(
          `Надминат е лимитот на активни објави. Максимум: ${limit}. Ве молиме изберете статус "Привремено застарена" или затворете други активни објави.`,
        );
      }
    }

    const listing = this.listingsRepository.create({
      ...createListingDto,
      title,
      status,
      currency: createListingDto.currency || CurrencyEnum.MKD,
      vehicle_id: savedVehicle.id,
      user_id: userId,
      last_updated_at: new Date(),
      registration_expires_at: createListingDto.registration_expires_at
        ? new Date(createListingDto.registration_expires_at)
        : null,
    });

    listing.vehicle = savedVehicle;
    const savedListing = await this.listingsRepository.save(listing);

    try {
      await this.redisService.delPattern('cache:listings:search:*');
      await this.redisService.del(`cache:listings:${savedListing.id}`);
    } catch (error) {
      console.warn('Failed to invalidate cache after creating listing', error);
    }

    return savedListing;
  }

  async findAll(searchDto: SearchListingsDto) {
    const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'DESC' } = searchDto;
    const skip = (page - 1) * limit;

    const cacheKey = `cache:listings:search:${JSON.stringify(searchDto)}`;
    try {
      const cached = await this.redisService.getJson<{
        data: Listing[];
        meta: { total: number; page: number; limit: number; totalPages: number };
      }>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (error) {
      console.warn('Failed to get listings from cache', error);
    }

    const queryBuilder = this.listingsRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.vehicle', 'vehicle')
      .leftJoinAndSelect('vehicle.brand', 'brand')
      .leftJoinAndSelect('vehicle.model', 'model')
      .leftJoinAndSelect('listing.user', 'user')
      .where('listing.status = :status', { status: ListingStatusEnum.Active });

    if (searchDto.brand_ids && searchDto.brand_ids.length > 0) {
      queryBuilder.andWhere('vehicle.brand_id IN (:...brand_ids)', {
        brand_ids: searchDto.brand_ids,
      });
    } else if (searchDto.brand_id) {
      queryBuilder.andWhere('vehicle.brand_id = :brand_id', { brand_id: searchDto.brand_id });
    }

    if (searchDto.model_ids && searchDto.model_ids.length > 0) {
      queryBuilder.andWhere('vehicle.model_id IN (:...model_ids)', {
        model_ids: searchDto.model_ids,
      });
    } else if (searchDto.model_id) {
      queryBuilder.andWhere('vehicle.model_id = :model_id', { model_id: searchDto.model_id });
    }

    if (searchDto.year_gte) {
      queryBuilder.andWhere('vehicle.year >= :year_gte', { year_gte: searchDto.year_gte });
    }

    if (searchDto.year_lte) {
      queryBuilder.andWhere('vehicle.year <= :year_lte', { year_lte: searchDto.year_lte });
    }

    if (searchDto.price_lte) {
      queryBuilder.andWhere('listing.price <= :price_lte', { price_lte: searchDto.price_lte });
    }

    if (searchDto.price_gte) {
      queryBuilder.andWhere('listing.price >= :price_gte', { price_gte: searchDto.price_gte });
    }

    if (searchDto.mileage_gte) {
      queryBuilder.andWhere('vehicle.mileage_km >= :mileage_gte', {
        mileage_gte: searchDto.mileage_gte,
      });
    }

    if (searchDto.mileage_lte) {
      queryBuilder.andWhere('vehicle.mileage_km <= :mileage_lte', {
        mileage_lte: searchDto.mileage_lte,
      });
    }

    if (searchDto.cities && searchDto.cities.length > 0) {
      queryBuilder.andWhere(
        searchDto.cities.map((_, index) => `listing.city ILIKE :city_${index}`).join(' OR '),
        searchDto.cities.reduce(
          (acc, city, index) => {
            acc[`city_${index}`] = `%${city}%`;
            return acc;
          },
          {} as Record<string, string>,
        ),
      );
    } else if (searchDto.city) {
      queryBuilder.andWhere('listing.city ILIKE :city', { city: `%${searchDto.city}%` });
    }

    if (searchDto.fuels && searchDto.fuels.length > 0) {
      queryBuilder.andWhere('vehicle.fuel IN (:...fuels)', { fuels: searchDto.fuels });
    } else if (searchDto.fuel) {
      queryBuilder.andWhere('vehicle.fuel = :fuel', { fuel: searchDto.fuel });
    }

    if (searchDto.transmissions && searchDto.transmissions.length > 0) {
      queryBuilder.andWhere('vehicle.transmission IN (:...transmissions)', {
        transmissions: searchDto.transmissions,
      });
    } else if (searchDto.transmission) {
      queryBuilder.andWhere('vehicle.transmission = :transmission', {
        transmission: searchDto.transmission,
      });
    }

    if (searchDto.body_types && searchDto.body_types.length > 0) {
      queryBuilder.andWhere('vehicle.body_type IN (:...body_types)', {
        body_types: searchDto.body_types,
      });
    } else if (searchDto.body_type) {
      queryBuilder.andWhere('vehicle.body_type = :body_type', {
        body_type: searchDto.body_type,
      });
    }

    if (searchDto.engine_displ_l_gte) {
      queryBuilder.andWhere('vehicle.engine_displ_l >= :engine_displ_l_gte', {
        engine_displ_l_gte: searchDto.engine_displ_l_gte,
      });
    }

    if (searchDto.engine_displ_l_lte) {
      queryBuilder.andWhere('vehicle.engine_displ_l <= :engine_displ_l_lte', {
        engine_displ_l_lte: searchDto.engine_displ_l_lte,
      });
    }

    if (searchDto.colors && searchDto.colors.length > 0) {
      queryBuilder.andWhere(
        searchDto.colors.map((_, index) => `vehicle.color ILIKE :color_${index}`).join(' OR '),
        searchDto.colors.reduce(
          (acc, color, index) => {
            acc[`color_${index}`] = `%${color}%`;
            return acc;
          },
          {} as Record<string, string>,
        ),
      );
    } else if (searchDto.color) {
      queryBuilder.andWhere('vehicle.color ILIKE :color', {
        color: `%${searchDto.color}%`,
      });
    }

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

    if (searchDto.title) {
      queryBuilder.andWhere('listing.title ILIKE :title', {
        title: `%${searchDto.title}%`,
      });
    }

    if (searchDto.urgent !== undefined) {
      queryBuilder.andWhere('listing.urgent = :urgent', {
        urgent: searchDto.urgent,
      });
    }

    if (searchDto.is_new !== undefined) {
      queryBuilder.andWhere('listing.is_new = :is_new', {
        is_new: searchDto.is_new,
      });
    }

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

    if (searchDto.horsepower_gte) {
      queryBuilder.andWhere('listing.horsepower >= :horsepower_gte', {
        horsepower_gte: searchDto.horsepower_gte,
      });
    }

    if (searchDto.horsepower_lte) {
      queryBuilder.andWhere('listing.horsepower <= :horsepower_lte', {
        horsepower_lte: searchDto.horsepower_lte,
      });
    }

    if (searchDto.drive_types && searchDto.drive_types.length > 0) {
      queryBuilder.andWhere('vehicle.drive_type IN (:...drive_types)', {
        drive_types: searchDto.drive_types,
      });
    }

    if (searchDto.is_registered !== undefined) {
      queryBuilder.andWhere('listing.is_registered = :is_registered', {
        is_registered: searchDto.is_registered,
      });
    }

    const validSortFields = ['created_at', 'price', 'year', 'views'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    if (sortField === 'year') {
      queryBuilder.orderBy('vehicle.year', order);
    } else if (sortField === 'views') {
      queryBuilder.orderBy('listing.views', 'DESC');
    } else {
      queryBuilder.orderBy(`listing.${sortField}`, order);
    }

    const [listings, total] = await queryBuilder.skip(skip).take(limit).getManyAndCount();

    const listingsWithoutPasswords = listings.map((listing) => {
      if (listing.user) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...userWithoutPassword } = listing.user;
        listing.user = userWithoutPassword as typeof listing.user;
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
      await this.redisService.setJson(cacheKey, result, this.CACHE_TTL);
    } catch (error) {
      console.warn('Failed to set listings cache', error);
    }

    return result;
  }

  async findOne(id: string): Promise<Listing> {
    const listing = await this.listingsRepository.findOne({
      where: { id },
      relations: ['vehicle', 'vehicle.brand', 'vehicle.model', 'user'],
    });
    if (!listing) {
      throw new NotFoundException('Објавата не е пронајдена');
    }

    if (listing.user) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userWithoutPassword } = listing.user;
      listing.user = userWithoutPassword as typeof listing.user;
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

    return listing;
  }

  async recordView(
    listingId: string,
    userId: string | null,
    visitorId: string | null,
  ): Promise<void> {
    const listing = await this.listingsRepository.findOne({ where: { id: listingId } });
    if (!listing) {
      return;
    }

    if (userId && userId === listing.user_id) {
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

    const titleParts = [];
    if (brand) titleParts.push(brand.name);
    if (model) titleParts.push(model.name);
    if (vehicle.year) titleParts.push(vehicle.year.toString());

    const transmissionStr =
      vehicle.transmission === 'Automatic'
        ? 'Автоматска'
        : vehicle.transmission === 'Manual'
          ? 'Мануелна'
          : vehicle.transmission === 'CVT'
            ? 'Варијатор'
            : '';

    const baseTitle = titleParts.join(' ');
    return transmissionStr ? `${baseTitle} (${transmissionStr})` : baseTitle;
  }

  async update(id: string, updateListingDto: UpdateListingDto, userId: string): Promise<Listing> {
    const listing = await this.findOne(id);
    if (listing.user_id !== userId) {
      throw new ForbiddenException('Немате пристап до оваа објава');
    }

    if (updateListingDto.vehicle) {
      const vehicleUpdate: Partial<CreateVehicleDto> = { ...updateListingDto.vehicle };
      await this.vehiclesRepository.update(listing.vehicle_id, vehicleUpdate);

      const updatedVehicle = await this.vehiclesRepository.findOne({
        where: { id: listing.vehicle_id },
      });
      if (updatedVehicle) {
        listing.title = await this.generateTitle(updatedVehicle);
      }
    }

    if (updateListingDto.registration_expires_at) {
      const registrationDate = new Date(updateListingDto.registration_expires_at);
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      const registrationMonth = registrationDate.getMonth();
      const registrationYear = registrationDate.getFullYear();

      if (
        registrationYear < currentYear ||
        (registrationYear === currentYear && registrationMonth < currentMonth)
      ) {
        throw new BadRequestException(
          'Датата на регистрација не може да биде помала од тековниот месец и година',
        );
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { vehicle, registration_expires_at, ...listingUpdate } = updateListingDto;
    Object.assign(listing, {
      ...listingUpdate,
      last_updated_at: new Date(),
      registration_expires_at: registration_expires_at
        ? new Date(registration_expires_at)
        : updateListingDto.registration_expires_at === null
          ? null
          : listing.registration_expires_at,
    });

    const updatedListing = await this.listingsRepository.save(listing);

    try {
      await this.redisService.delPattern('cache:listings:search:*');
      await this.redisService.del(`cache:listings:${id}`);
    } catch (error) {
      console.warn('Failed to invalidate cache after updating listing', error);
    }

    return updatedListing;
  }

  async publish(id: string, userId: string): Promise<Listing> {
    const listing = await this.findOne(id);
    if (listing.user_id !== userId) {
      throw new ForbiddenException('Немате пристап до оваа објава');
    }

    const activeCount = await this.getActiveListingsCount(userId);
    const limit = await this.usersService.getListingLimit(userId);

    if (listing.status === ListingStatusEnum.Active) {
      throw new BadRequestException('Објавата е веќе активна');
    }

    if (activeCount >= limit) {
      throw new BadRequestException(`Надминат е лимитот на активни објави. Максимум: ${limit}`);
    }

    listing.status = ListingStatusEnum.Active;
    listing.last_updated_at = new Date();
    const publishedListing = await this.listingsRepository.save(listing);

    try {
      await this.redisService.delPattern('cache:listings:search:*');
      await this.redisService.del(`cache:listings:${id}`);
    } catch (error) {
      console.warn('Failed to invalidate cache after publishing listing', error);
    }

    return publishedListing;
  }

  async pause(id: string, userId: string): Promise<Listing> {
    const listing = await this.findOne(id);
    if (listing.user_id !== userId) {
      throw new ForbiddenException('Немате пристап до оваа објава');
    }

    listing.status = ListingStatusEnum.Paused;
    const pausedListing = await this.listingsRepository.save(listing);

    try {
      await this.redisService.delPattern('cache:listings:search:*');
      await this.redisService.del(`cache:listings:${id}`);
    } catch (error) {
      console.warn('Failed to invalidate cache after pausing listing', error);
    }

    return pausedListing;
  }

  async close(id: string, userId: string): Promise<Listing> {
    const listing = await this.findOne(id);
    if (listing.user_id !== userId) {
      throw new ForbiddenException('Немате пристап до оваа објава');
    }

    listing.status = ListingStatusEnum.Closed;
    const closedListing = await this.listingsRepository.save(listing);

    try {
      await this.redisService.delPattern('cache:listings:search:*');
      await this.redisService.del(`cache:listings:${id}`);
    } catch (error) {
      console.warn('Failed to invalidate cache after closing listing', error);
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
  async autoCloseOldListings() {
    const fiveMonthsAgo = new Date();
    fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 5);

    await this.listingsRepository.update(
      {
        status: ListingStatusEnum.Active,
        last_updated_at: LessThanOrEqual(fiveMonthsAgo),
      },
      {
        status: ListingStatusEnum.Closed,
      },
    );
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
      order: { created_at: 'DESC' },
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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...userWithoutPassword } = listing.user;
        listing.user = userWithoutPassword as typeof listing.user;
        listing.user.phone = null;
        listing.user.email = null;
        listing.user.firstName = null;
        listing.user.lastName = null;
        listing.user.companyName = null;
      }
      return listing;
    });
  }
}
