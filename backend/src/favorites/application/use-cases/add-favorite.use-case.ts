import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { logUserEvent } from '../../../common/utils/log-user-event';
import { Listing } from '../../../listings/entities/listing.entity';
import { Favorite } from '../../entities/favorite.entity';

@Injectable()
export class AddFavoriteUseCase {
  private readonly logger = new Logger(AddFavoriteUseCase.name);

  constructor(
    @InjectRepository(Favorite)
    private readonly favoritesRepository: Repository<Favorite>,
    @InjectRepository(Listing)
    private readonly listingsRepository: Repository<Listing>,
  ) {}

  async execute(userId: string, listingId: string): Promise<Favorite> {
    const listing = await this.listingsRepository.findOne({
      where: { id: listingId },
      select: ['id', 'user_id'],
    });

    if (!listing) {
      throw new NotFoundException('errors.listingNotFound');
    }

    if (listing.user_id === userId) {
      throw new BadRequestException('errors.cannotAddOwnListingToFavorites');
    }

    const existing = await this.favoritesRepository.findOne({
      where: { user_id: userId, listing_id: listingId },
    });

    if (existing) {
      return existing;
    }

    const favorite = this.favoritesRepository.create({
      user_id: userId,
      listing_id: listingId,
    });

    const saved = await this.favoritesRepository.save(favorite);
    logUserEvent(this.logger, {
      event: 'favorite_added',
      userId,
      listingId,
    });
    return saved;
  }
}
