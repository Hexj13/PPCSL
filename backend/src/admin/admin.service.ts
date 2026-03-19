import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RefreshTokenService } from '../auth/infrastructure/services/refresh-token.service';
import {
  ListingStatus,
  ListingStatus as ListingStatusEnum,
  UserType as UserTypeEnum,
} from '../common/types';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { IListingCache, LISTING_CACHE } from '../listings/application/ports/listing-cache.port';
import { Listing } from '../listings/entities/listing.entity';
import { PromotionHistory } from '../listings/entities/promotion-history.entity';
import { ListingsService } from '../listings/listings.service';
import { UsersService } from '../users/application/users.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Listing)
    private listingsRepository: Repository<Listing>,
    @InjectRepository(PromotionHistory)
    private promotionHistoryRepository: Repository<PromotionHistory>,
    private refreshTokenService: RefreshTokenService,
    private listingsService: ListingsService,
    private exchangeRatesService: ExchangeRatesService,
    @Inject(LISTING_CACHE)
    private listingCache: IListingCache,
    private usersService: UsersService,
  ) {}

  async getAllUsers(
    page: number = 1,
    limit: number = 20,
    searchQuery?: string,
    userType?: string,
  ): Promise<{
    data: Array<
      Omit<User, 'password' | 'getDisplayName' | 'canCreateListing' | 'deactivate' | 'isAdmin'>
    >;
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const skip = (page - 1) * limit;
    const queryBuilder = this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.listings', 'listings')
      .orderBy('user.created_at', 'DESC');

    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      queryBuilder.where(
        '(LOWER(CAST(user.id AS TEXT)) LIKE :search OR LOWER(user.email) LIKE :search OR LOWER(user.phone) LIKE :search OR LOWER(user.firstName) LIKE :search OR LOWER(user.lastName) LIKE :search OR LOWER(user.companyName) LIKE :search)',
        { search: `%${searchLower}%` },
      );
    }

    if (userType && userType !== 'All') {
      if (searchQuery) {
        queryBuilder.andWhere('user.type = :userType', { userType });
      } else {
        queryBuilder.where('user.type = :userType', { userType });
      }
    }

    const [users, total] = await queryBuilder.skip(skip).take(limit).getManyAndCount();

    const processedUsers = users.map((user) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data: processedUsers,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async getUserListings(userId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: [
        'listings',
        'listings.vehicle',
        'listings.vehicle.brand',
        'listings.vehicle.model',
      ],
    });
    if (!user) {
      throw new NotFoundException('errors.userNotFound');
    }
    return user.listings || [];
  }

  async validateAssignUser(userId: string): Promise<{
    valid: boolean;
    user?: {
      id: string;
      displayName: string;
      type: string;
      activeListings: number;
      listingLimit: number;
    };
    error?: string;
  }> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      return { valid: false, error: 'errors.userNotFound' };
    }

    if (!user.active) {
      return { valid: false, error: 'errors.assignedUserDeactivated' };
    }

    const activeListings = await this.listingsRepository.count({
      where: { user_id: userId, status: ListingStatusEnum.Active },
    });
    const listingLimit = await this.usersService.getListingLimit(userId);

    if (activeListings >= listingLimit) {
      return { valid: false, error: 'errors.activeListingsLimitExceeded' };
    }

    const displayName =
      user.getDisplayName()?.trim() || user.email?.trim() || user.phone?.trim() || user.id;

    return {
      valid: true,
      user: {
        id: user.id,
        displayName,
        type: user.type,
        activeListings,
        listingLimit,
      },
    };
  }

  async toggleUserStatus(userId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('errors.userNotFound');
    }

    const isDeletedUser =
      !user.firstName && !user.lastName && !user.companyName && !user.email && !user.phone;

    if (isDeletedUser && !user.active) {
      throw new BadRequestException('errors.cannotActivateDeletedUser');
    }

    const wasActive = user.active;
    user.active = !user.active;
    const savedUser = await this.usersRepository.save(user);

    if (wasActive && !savedUser.active) {
      await this.refreshTokenService.revokeAllUserTokens(userId);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = savedUser;
    return userWithoutPassword;
  }

  async getAllListings(
    page: number = 1,
    limit: number = 20,
    listingId?: string,
    userId?: string,
    status?: ListingStatus,
    isPromoted?: boolean,
    search?: string,
  ): Promise<{
    data: Listing[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const skip = (page - 1) * limit;
    const queryBuilder = this.listingsRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.vehicle', 'vehicle')
      .leftJoinAndSelect('vehicle.brand', 'brand')
      .leftJoinAndSelect('vehicle.model', 'model')
      .leftJoinAndSelect('listing.user', 'user')
      .orderBy('listing.created_at', 'DESC');

    const conditions: string[] = [];
    const params: Record<string, unknown> = {};

    const searchTrimmed = search?.trim();
    if (searchTrimmed) {
      conditions.push(
        '(CAST(listing.id AS TEXT) = :search OR CAST(listing.user_id AS TEXT) = :search)',
      );
      params.search = searchTrimmed;
    } else if (listingId && userId) {
      conditions.push(
        '(CAST(listing.id AS TEXT) = :listingId OR CAST(listing.user_id AS TEXT) = :userId)',
      );
      params.listingId = listingId;
      params.userId = userId;
    } else if (listingId) {
      conditions.push('CAST(listing.id AS TEXT) = :listingId');
      params.listingId = listingId;
    } else if (userId) {
      conditions.push('CAST(listing.user_id AS TEXT) = :userId');
      params.userId = userId;
    }

    if (status) {
      conditions.push('listing.status = :status');
      params.status = status;
    }

    if (isPromoted !== undefined) {
      if (isPromoted) {
        conditions.push('listing.is_promoted = :isPromoted');
        conditions.push('(listing.promoted_until > :now OR listing.promoted_until IS NULL)');
        params.isPromoted = true;
        params.now = new Date();
      } else {
        conditions.push(
          '(listing.is_promoted = :isPromoted OR (listing.promoted_until <= :now AND listing.promoted_until IS NOT NULL))',
        );
        params.isPromoted = false;
        params.now = new Date();
      }
    }

    if (conditions.length > 0) {
      queryBuilder.where(conditions.join(' AND '), params);
    }

    const [listings, total] = await queryBuilder.skip(skip).take(limit).getManyAndCount();

    const processedListings = listings.map((listing) => {
      if (listing.user) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...userWithoutPassword } = listing.user;
        listing.user = userWithoutPassword as typeof listing.user;

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

    const enrichedListings =
      await this.exchangeRatesService.enrichListingsWithApproxPrice(processedListings);

    const totalPages = Math.ceil(total / limit);

    return {
      data: enrichedListings,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async getListingsStatusCounts(
    listingId?: string,
    userId?: string,
    search?: string,
  ): Promise<{
    Active: number;
    Paused: number;
    Closed: number;
    Promoted: number;
  }> {
    const searchTrimmed = search?.trim();
    const buildBase = () => {
      const qb = this.listingsRepository.createQueryBuilder('listing');
      if (searchTrimmed) {
        qb.where(
          '(CAST(listing.id AS TEXT) = :search OR CAST(listing.user_id AS TEXT) = :search)',
          {
            search: searchTrimmed,
          },
        );
      } else if (listingId && userId) {
        qb.where(
          '(CAST(listing.id AS TEXT) = :listingId OR CAST(listing.user_id AS TEXT) = :userId)',
          {
            listingId,
            userId,
          },
        );
      } else if (listingId) {
        qb.where('CAST(listing.id AS TEXT) = :listingId', { listingId });
      } else if (userId) {
        qb.where('CAST(listing.user_id AS TEXT) = :userId', { userId });
      }
      return qb;
    };

    const [active, paused, closed, promoted] = await Promise.all([
      buildBase()
        .andWhere('listing.status = :status', { status: ListingStatusEnum.Active })
        .getCount(),
      buildBase()
        .andWhere('listing.status = :status', { status: ListingStatusEnum.Paused })
        .getCount(),
      buildBase()
        .andWhere('listing.status = :status', { status: ListingStatusEnum.Closed })
        .getCount(),
      buildBase()
        .andWhere('listing.is_promoted = :isPromoted', { isPromoted: true })
        .andWhere('(listing.promoted_until IS NULL OR listing.promoted_until > :now)', {
          now: new Date(),
        })
        .getCount(),
    ]);

    return {
      Active: active,
      Paused: paused,
      Closed: closed,
      Promoted: promoted,
    };
  }

  async updateListingStatus(listingId: string, status: ListingStatus) {
    const listing = await this.listingsRepository.findOne({
      where: { id: listingId },
    });
    if (!listing) {
      throw new NotFoundException('errors.listingNotFound');
    }
    listing.status = status;
    return this.listingsRepository.save(listing);
  }

  async getUserStats() {
    const totalUsers = await this.usersRepository.count();
    const individualUsers = await this.usersRepository.count({
      where: { type: UserTypeEnum.Individual },
    });
    const businessUsers = await this.usersRepository.count({
      where: { type: UserTypeEnum.Business },
    });
    const adminUsers = await this.usersRepository.count({
      where: { type: UserTypeEnum.Admin },
    });

    return {
      total: totalUsers,
      individual: individualUsers,
      business: businessUsers,
      admin: adminUsers,
    };
  }

  async getListingStats() {
    const total = await this.listingsRepository.count();
    const active = await this.listingsRepository.count({
      where: { status: ListingStatusEnum.Active },
    });
    const paused = await this.listingsRepository.count({
      where: { status: ListingStatusEnum.Paused },
    });
    const closed = await this.listingsRepository.count({
      where: { status: ListingStatusEnum.Closed },
    });

    return {
      total,
      active,
      paused,
      closed,
    };
  }

  async toggleListingPromotion(
    id: string,
    isPromoted: boolean,
    days?: number | null,
  ): Promise<Listing> {
    const listing = await this.listingsRepository.findOne({ where: { id } });
    if (!listing) {
      throw new NotFoundException('errors.listingNotFound');
    }

    const wasPromoted = listing.is_promoted;
    listing.is_promoted = isPromoted;

    if (isPromoted) {
      const now = new Date();
      listing.promoted_started_at = now;
      listing.promoted_paused_at = null;

      if (days === null) {
        listing.promoted_until = null;
      } else if (days && days > 0) {
        const until = new Date();
        until.setDate(until.getDate() + days);
        listing.promoted_until = until;
      } else {
        const until = new Date();
        until.setDate(until.getDate() + 7);
        listing.promoted_until = until;
      }

      if (!wasPromoted && listing.user_id) {
        await this.listingsService.createPromotionHistory(
          listing.id,
          listing.user_id,
          listing.title,
          days ?? null,
        );
      }
    } else {
      listing.promoted_until = null;
      listing.promoted_started_at = null;
      listing.promoted_paused_at = null;

      if (wasPromoted) {
        await this.listingsService.updatePromotionHistoryEndDate(listing.id);
      }
    }

    try {
      await this.listingCache.invalidateSearch();
      await this.listingCache.invalidateSingle(id);
    } catch {
      // Ignore cache errors
    }

    return await this.listingsRepository.save(listing);
  }

  async getAllPromotions(
    page: number = 1,
    limit: number = 50,
    listingId?: string,
    userId?: string,
    fromDate?: Date,
  ): Promise<{
    data: Array<PromotionHistory & { listing_status?: ListingStatusEnum; listing_id: string }>;
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const skip = (page - 1) * limit;

    const queryBuilder = this.promotionHistoryRepository
      .createQueryBuilder('ph')
      .leftJoinAndSelect('ph.listing', 'listing')
      .orderBy('ph.started_at', 'DESC');

    const conditions: string[] = [];
    const params: Record<string, unknown> = {};

    if (listingId && userId) {
      conditions.push(
        '(CAST(ph.listing_id AS TEXT) = :listingId OR CAST(ph.user_id AS TEXT) = :userId)',
      );
      params.listingId = listingId;
      params.userId = userId;
    } else if (listingId) {
      conditions.push('CAST(ph.listing_id AS TEXT) = :listingId');
      params.listingId = listingId;
    } else if (userId) {
      conditions.push('CAST(ph.user_id AS TEXT) = :userId');
      params.userId = userId;
    }

    if (fromDate) {
      conditions.push('ph.started_at >= :fromDate');
      params.fromDate = fromDate;
    }

    if (conditions.length > 0) {
      queryBuilder.where(conditions.join(' AND '), params);
    }

    const [history, total] = await queryBuilder.skip(skip).take(limit).getManyAndCount();

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
}
