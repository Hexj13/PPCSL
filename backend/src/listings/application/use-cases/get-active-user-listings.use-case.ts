import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ListingStatus as ListingStatusEnum } from '../../../common/types';
import { ExchangeRatesService } from '../../../exchange-rates/exchange-rates.service';
import { Listing } from '../../entities/listing.entity';
import {
  applyOwnerListingCardSelects,
  getListingCardPage,
} from '../../infrastructure/persistence/listing-card-query.utils';
import { stripListingVideosForListResponse } from '../utils/listing-video-public.util';

export const MAX_ACTIVE_LISTINGS_LIMIT = 50;

@Injectable()
export class GetActiveUserListingsUseCase {
  constructor(
    @InjectRepository(Listing)
    private readonly listingsRepository: Repository<Listing>,
    private readonly exchangeRatesService: ExchangeRatesService,
  ) {}

  async execute(userId: string, page = 1, limit = 20): Promise<Listing[]> {
    const safePage = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
    const safeLimit =
      Number.isFinite(limit) && limit >= 1
        ? Math.min(Math.floor(limit), MAX_ACTIVE_LISTINGS_LIMIT)
        : 20;

    const qb = applyOwnerListingCardSelects(this.listingsRepository.createQueryBuilder('listing'))
      .where('listing.user_id = :userId', { userId })
      .andWhere('listing.status = :status', { status: ListingStatusEnum.Active })
      .orderBy('listing.is_promoted', 'DESC')
      .addOrderBy('listing.created_at', 'DESC');

    const listings = await getListingCardPage(qb, (safePage - 1) * safeLimit, safeLimit);
    stripListingVideosForListResponse(listings);
    return this.exchangeRatesService.enrichListingsWithApproxPrice(listings);
  }
}
