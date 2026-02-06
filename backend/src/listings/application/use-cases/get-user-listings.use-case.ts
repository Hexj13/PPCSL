import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { REFRESH_COOLDOWN_MS } from '../../../common/constants';
import { UsersService } from '../../../users/application/users.service';
import { Listing } from '../../entities/listing.entity';

@Injectable()
export class GetUserListingsUseCase {
  constructor(
    @InjectRepository(Listing)
    private readonly listingsRepository: Repository<Listing>,
    private readonly usersService: UsersService,
  ) {}

  async execute(
    userId: string,
    page: number = 1,
    limit: number = 20,
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
    const [listings, total] = await this.listingsRepository.findAndCount({
      where: { user_id: userId },
      relations: ['vehicle', 'vehicle.brand', 'vehicle.model'],
      order: { created_at: 'DESC' },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);
    const lastRefresh = await this.usersService.getLastListingRefreshAt(userId);

    return {
      data: listings,
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
