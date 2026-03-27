import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';

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

    let listings: Listing[] = [];
    let total = 0;

    if (searchQuery) {
      const qb = this.listingsRepository
        .createQueryBuilder('listing')
        .leftJoinAndSelect('listing.vehicle', 'vehicle')
        .leftJoinAndSelect('vehicle.brand', 'brand')
        .leftJoinAndSelect('vehicle.model', 'model')
        .leftJoinAndSelect('listing.tire', 'tire')
        .leftJoinAndSelect('tire.brand', 'tireBrand')
        .leftJoinAndSelect('tire.model', 'tireModel')
        .where('listing.user_id = :userId', { userId });

      if (status) {
        qb.andWhere('listing.status = :status', { status });
      }

      if (promoted !== undefined) {
        qb.andWhere('listing.is_promoted = :promoted', { promoted });
      }

      qb.andWhere(
        new Brackets((searchQb) => {
          searchQb
            .where('brand.name ILIKE :search', { search: `%${searchQuery}%` })
            .orWhere('model.name ILIKE :search', { search: `%${searchQuery}%` });
        }),
      );

      const result = await qb
        .orderBy('listing.created_at', 'DESC')
        .skip(skip)
        .take(limit)
        .getManyAndCount();
      listings = result[0];
      total = result[1];
    } else {
      const where: Record<string, unknown> = { user_id: userId };
      if (status) {
        where.status = status;
      }
      if (promoted !== undefined) {
        where.is_promoted = promoted;
      }

      const result = await this.listingsRepository.findAndCount({
        where,
        relations: [
          'vehicle',
          'vehicle.brand',
          'vehicle.model',
          'tire',
          'tire.brand',
          'tire.model',
        ],
        order: { created_at: 'DESC' },
        skip,
        take: limit,
      });
      listings = result[0];
      total = result[1];
    }

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
