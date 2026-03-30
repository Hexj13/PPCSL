import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { logUserEvent } from '../common/utils/log-user-event';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { maskClosedListingForPublicView } from '../listings/application/utils/mask-closed-listing-for-public-view';
import { Listing } from '../listings/entities/listing.entity';

import { Favorite } from './entities/favorite.entity';

@Injectable()
export class FavoritesService {
  private readonly logger = new Logger(FavoritesService.name);

  constructor(
    @InjectRepository(Favorite)
    private favoritesRepository: Repository<Favorite>,
    @InjectRepository(Listing)
    private listingsRepository: Repository<Listing>,
    private readonly exchangeRatesService: ExchangeRatesService,
  ) {}

  async add(userId: string, listingId: string): Promise<Favorite> {
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

  async remove(userId: string, listingId: string): Promise<void> {
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

  async findAll(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: Favorite[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const skip = (page - 1) * limit;

    const [favorites, total] = await this.favoritesRepository
      .createQueryBuilder('favorite')
      .leftJoinAndSelect('favorite.listing', 'listing')
      .leftJoinAndSelect('listing.vehicle', 'vehicle')
      .leftJoinAndSelect('vehicle.brand', 'brand')
      .leftJoinAndSelect('vehicle.model', 'model')
      .leftJoinAndSelect('listing.tire', 'tire')
      .leftJoinAndSelect('tire.brand', 'tireBrand')
      .leftJoinAndSelect('tire.model', 'tireModel')
      .leftJoinAndSelect('listing.user', 'user')
      .where('favorite.user_id = :userId', { userId })
      .orderBy('listing.is_promoted', 'DESC')
      .addOrderBy('listing.last_updated_at', 'DESC')
      .addOrderBy('listing.id', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const listings = favorites.map((f) => f.listing).filter(Boolean);
    const enriched = await this.exchangeRatesService.enrichListingsWithApproxPrice(listings);
    const enrichedMap = new Map(enriched.map((l) => [l.id, l]));

    const data = favorites.map((f) => {
      if (f.listing) {
        f.listing = enrichedMap.get(f.listing.id) ?? f.listing;
        maskClosedListingForPublicView(f.listing);
      }
      return f;
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async checkIfFavorite(userId: string, listingId: string): Promise<boolean> {
    const favorite = await this.favoritesRepository.findOne({
      where: { user_id: userId, listing_id: listingId },
    });
    return !!favorite;
  }

  async getUserFavoriteIds(userId: string): Promise<string[]> {
    const favorites = await this.favoritesRepository.find({
      where: { user_id: userId },
      select: ['listing_id'],
    });
    return favorites.map((f) => f.listing_id);
  }

  async checkBatch(userId: string, listingIds: string[]): Promise<Record<string, boolean>> {
    if (!listingIds || listingIds.length === 0) {
      return {};
    }

    const favorites = await this.favoritesRepository
      .createQueryBuilder('favorite')
      .where('favorite.user_id = :userId', { userId })
      .andWhere('favorite.listing_id IN (:...listingIds)', { listingIds })
      .select(['favorite.listing_id'])
      .getMany();

    const favoriteIds = new Set(favorites.map((f) => f.listing_id));
    const result: Record<string, boolean> = {};

    for (const listingId of listingIds) {
      result[listingId] = favoriteIds.has(listingId);
    }

    return result;
  }
}
