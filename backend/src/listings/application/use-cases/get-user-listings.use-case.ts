import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, type SelectQueryBuilder } from 'typeorm';

import { REFRESH_COOLDOWN_MS } from '../../../common/constants';
import { ExchangeRatesService } from '../../../exchange-rates/exchange-rates.service';
import { UsersService } from '../../../users/application/users.service';
import { Listing } from '../../entities/listing.entity';
import {
  applyOwnerListingCardSelects,
  getListingCardPage,
} from '../../infrastructure/persistence/listing-card-query.utils';
import { stripListingVideosForListResponse } from '../utils/listing-video-public.util';

function applyOwnerListingListFilters(
  qb: SelectQueryBuilder<Listing>,
  params: {
    userId: string;
    status?: string;
    promoted?: boolean;
    searchQuery?: string;
  },
): SelectQueryBuilder<Listing> {
  qb.where('listing.user_id = :userId', { userId: params.userId });
  if (params.status) {
    qb.andWhere('listing.status = :status', { status: params.status });
  }
  if (params.promoted !== undefined) {
    qb.andWhere('listing.is_promoted = :promoted', { promoted: params.promoted });
  }
  if (params.searchQuery) {
    qb.andWhere(
      new Brackets((searchQb) => {
        searchQb
          .where('brand.name ILIKE :search', { search: `%${params.searchQuery}%` })
          .orWhere('model.name ILIKE :search', { search: `%${params.searchQuery}%` });
      }),
    );
  }
  return qb;
}

@Injectable()
export class GetUserListingsUseCase {
  constructor(
    @InjectRepository(Listing)
    private readonly listingsRepository: Repository<Listing>,
    private readonly usersService: UsersService,
    private readonly exchangeRatesService: ExchangeRatesService,
  ) {}

  async execute(
    userId: string,
    page: number = 1,
    limit: number = 20,
    status?: string,
    promoted?: boolean,
    search?: string,
  ): Promise<{
    data: Listing[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      last_listing_refresh_at: string | null;
      refreshCooldownMs: number;
    };
  }> {
    const skip = (page - 1) * limit;
    const searchQuery = search?.trim();
    const filters = { userId, status, promoted, searchQuery };

    const countQb = this.listingsRepository.createQueryBuilder('listing');
    if (searchQuery) {
      countQb
        .leftJoin('listing.vehicle', 'vehicle')
        .leftJoin('vehicle.brand', 'brand')
        .leftJoin('vehicle.model', 'model');
    }

    const total = await applyOwnerListingListFilters(countQb, filters).getCount();
    const listings = await getListingCardPage(
      applyOwnerListingListFilters(
        applyOwnerListingCardSelects(this.listingsRepository.createQueryBuilder('listing')),
        filters,
      ).orderBy('listing.created_at', 'DESC'),
      skip,
      limit,
    );

    const totalPages = Math.ceil(total / limit);
    const lastRefresh = await this.usersService.getLastListingRefreshAt(userId);
    stripListingVideosForListResponse(listings);
    const enriched = await this.exchangeRatesService.enrichListingsWithApproxPrice(listings);

    return {
      data: enriched,
      meta: {
        total,
        page,
        limit,
        totalPages,
        last_listing_refresh_at: lastRefresh ? lastRefresh.toISOString() : null,
        refreshCooldownMs: REFRESH_COOLDOWN_MS,
      },
    };
  }
}
