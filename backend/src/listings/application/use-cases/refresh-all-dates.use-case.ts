import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { REFRESH_COOLDOWN_MS } from '../../../common/constants';
import { ListingStatus as ListingStatusEnum } from '../../../common/types';
import { UsersService } from '../../../users/application/users.service';
import { Listing } from '../../entities/listing.entity';

@Injectable()
export class RefreshAllDatesUseCase {
  constructor(
    @InjectRepository(Listing)
    private readonly listingsRepository: Repository<Listing>,
    private readonly usersService: UsersService,
  ) {}

  async execute(userId: string): Promise<{ updated: number }> {
    const now = new Date();
    const lastRefresh = await this.usersService.getLastListingRefreshAt(userId);
    if (lastRefresh) {
      const elapsed = now.getTime() - lastRefresh.getTime();
      if (elapsed < REFRESH_COOLDOWN_MS) {
        throw new BadRequestException('errors.refreshDatesTooSoon');
      }
    }
    const result = await this.listingsRepository.update(
      { user_id: userId, status: ListingStatusEnum.Active },
      { last_updated_at: now },
    );
    await this.usersService.update(userId, { last_listing_refresh_at: now });
    return { updated: result.affected || 0 };
  }
}
