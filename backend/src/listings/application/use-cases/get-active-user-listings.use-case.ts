import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ListingStatus as ListingStatusEnum } from '../../../common/types';
import { ExchangeRatesService } from '../../../exchange-rates/exchange-rates.service';
import { Listing } from '../../entities/listing.entity';

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

    const listings = await this.listingsRepository.find({
      where: { user_id: userId, status: ListingStatusEnum.Active },
      relations: ['vehicle', 'vehicle.brand', 'vehicle.model', 'tire', 'tire.brand', 'tire.model'],
      order: { is_promoted: 'DESC', created_at: 'DESC' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });
    return this.exchangeRatesService.enrichListingsWithApproxPrice(listings);
  }
}
