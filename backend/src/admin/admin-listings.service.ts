import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ListingStatus, ListingStatus as ListingStatusEnum } from '../common/types';
import { buildPaginationMeta } from '../common/utils/pagination.utils';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { Listing } from '../listings/entities/listing.entity';

@Injectable()
export class AdminListingsService {
  constructor(
    @InjectRepository(Listing)
    private listingsRepository: Repository<Listing>,
    private exchangeRatesService: ExchangeRatesService,
  ) {}

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
      .leftJoinAndSelect('listing.tire', 'tire')
      .leftJoinAndSelect('tire.brand', 'tireBrand')
      .leftJoinAndSelect('tire.model', 'tireModel')
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
          listing.user.additionalPhone = null;
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

    return {
      data: enrichedListings,
      meta: buildPaginationMeta(total, page, limit),
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
    const allowed: readonly string[] = ['Active', 'Paused', 'Closed'];
    if (!allowed.includes(status)) {
      throw new BadRequestException('errors.invalidListingStatus');
    }
    const listing = await this.listingsRepository.findOne({
      where: { id: listingId },
    });
    if (!listing) {
      throw new NotFoundException('errors.listingNotFound');
    }
    listing.status = status;
    return this.listingsRepository.save(listing);
  }
}
