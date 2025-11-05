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
  constructor(
    @InjectRepository(Listing)
    private listingsRepository: Repository<Listing>,
    @InjectRepository(Vehicle)
    private vehiclesRepository: Repository<Vehicle>,
    @InjectRepository(ListingView)
    private listingViewsRepository: Repository<ListingView>,
    private usersService: UsersService,
    private brandsService: BrandsService,
  ) {}

  async create(createListingDto: CreateListingDto, userId: string): Promise<Listing> {
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
    });

    listing.vehicle = savedVehicle;
    return this.listingsRepository.save(listing);
  }

  async findAll(searchDto: SearchListingsDto) {
    const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'DESC' } = searchDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.listingsRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.vehicle', 'vehicle')
      .leftJoinAndSelect('vehicle.brand', 'brand')
      .leftJoinAndSelect('vehicle.model', 'model')
      .leftJoinAndSelect('listing.user', 'user')
      .where('listing.status = :status', { status: ListingStatusEnum.Active });

    if (searchDto.brand_id) {
      queryBuilder.andWhere('vehicle.brand_id = :brand_id', { brand_id: searchDto.brand_id });
    }

    if (searchDto.model_id) {
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

    if (searchDto.city) {
      queryBuilder.andWhere('listing.city ILIKE :city', { city: `%${searchDto.city}%` });
    }

    if (searchDto.fuel) {
      queryBuilder.andWhere('vehicle.fuel = :fuel', { fuel: searchDto.fuel });
    }

    if (searchDto.transmission) {
      queryBuilder.andWhere('vehicle.transmission = :transmission', {
        transmission: searchDto.transmission,
      });
    }

    if (searchDto.body_type) {
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

    if (searchDto.color) {
      queryBuilder.andWhere('vehicle.color ILIKE :color', {
        color: `%${searchDto.color}%`,
      });
    }

    if (searchDto.doors) {
      queryBuilder.andWhere('vehicle.doors = :doors', {
        doors: searchDto.doors,
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
      await this.listingsRepository.increment({ id: listingId }, 'views', 1);
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
      await this.listingsRepository.increment({ id: listingId }, 'views', 1);
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { vehicle, ...listingUpdate } = updateListingDto;
    Object.assign(listing, {
      ...listingUpdate,
      last_updated_at: new Date(),
    });

    return this.listingsRepository.save(listing);
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
    return this.listingsRepository.save(listing);
  }

  async pause(id: string, userId: string): Promise<Listing> {
    const listing = await this.findOne(id);
    if (listing.user_id !== userId) {
      throw new ForbiddenException('Немате пристап до оваа објава');
    }

    listing.status = ListingStatusEnum.Paused;
    return this.listingsRepository.save(listing);
  }

  async close(id: string, userId: string): Promise<Listing> {
    const listing = await this.findOne(id);
    if (listing.user_id !== userId) {
      throw new ForbiddenException('Немате пристап до оваа објава');
    }

    listing.status = ListingStatusEnum.Closed;
    return this.listingsRepository.save(listing);
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

  async getUserListings(userId: string): Promise<Listing[]> {
    return this.listingsRepository.find({
      where: { user_id: userId },
      relations: ['vehicle', 'vehicle.brand', 'vehicle.model'],
      order: { created_at: 'DESC' },
    });
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
