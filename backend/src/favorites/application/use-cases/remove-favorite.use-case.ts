import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { logUserEvent } from '../../../common/utils/log-user-event';
import { Favorite } from '../../entities/favorite.entity';

@Injectable()
export class RemoveFavoriteUseCase {
  private readonly logger = new Logger(RemoveFavoriteUseCase.name);

  constructor(
    @InjectRepository(Favorite)
    private readonly favoritesRepository: Repository<Favorite>,
  ) {}

  async execute(userId: string, listingId: string): Promise<void> {
    const result = await this.favoritesRepository.delete({
      user_id: userId,
      listing_id: listingId,
    });

    if (result.affected === 0) {
      throw new NotFoundException('errors.favoriteNotFound');
    }

    logUserEvent(this.logger, {
      event: 'favorite_removed',
      userId,
      listingId,
    });
  }
}
