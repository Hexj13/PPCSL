import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { REFRESH_COOLDOWN_MS } from '../../../common/constants';
import { ExchangeRatesService } from '../../../exchange-rates/exchange-rates.service';
import { UsersService } from '../../../users/application/users.service';
import { Listing } from '../../entities/listing.entity';

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
    const where: Record<string, unknown> = { user_id: userId };
    if (status) {
      where.status = status;
    }
    if (promoted !== undefined) {
      where.is_promoted = promoted;
    }
    const [listings, total] = await this.listingsRepository.findAndCount({
      where,
      relations: ['vehicle', 'vehicle.brand', 'vehicle.model'],
      order: { created_at: 'DESC' },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);
    const lastRefresh = await this.usersService.getLastListingRefreshAt(userId);
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
