import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { REFRESH_COOLDOWN_MS } from '../../../common/constants';
import { ListingStatus as ListingStatusEnum } from '../../../common/types';
import { User } from '../../../users/entities/user.entity';
import { Listing } from '../../entities/listing.entity';

@Injectable()
export class RefreshAllDatesUseCase {
  constructor(
    @InjectRepository(Listing)
    private readonly listingsRepository: Repository<Listing>,
  ) {}

  async execute(userId: string): Promise<{ updated: number }> {
    const now = new Date();
    const cooldownThreshold = new Date(now.getTime() - REFRESH_COOLDOWN_MS);
    return this.listingsRepository.manager.transaction(async (manager) => {
      const cooldownGuard = await manager
        .createQueryBuilder()
        .update(User)
        .set({ last_listing_refresh_at: now })
        .where('id = :userId', { userId })
        .andWhere(
          '(last_listing_refresh_at IS NULL OR last_listing_refresh_at < :cooldownThreshold)',
          {
            cooldownThreshold,
          },
        )
        .execute();

      if (!cooldownGuard.affected) {
        throw new BadRequestException('errors.refreshDatesTooSoon');
      }

      const result = await manager.update(
        Listing,
        { user_id: userId, status: ListingStatusEnum.Active },
        { last_updated_at: now },
      );

      return { updated: result.affected || 0 };
    });
  }
}
