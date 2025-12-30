import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Listing } from '../listings/entities/listing.entity';

import { Favorite } from './entities/favorite.entity';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private favoritesRepository: Repository<Favorite>,
    @InjectRepository(Listing)
    private listingsRepository: Repository<Listing>,
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

    return this.favoritesRepository.save(favorite);
  }

  async remove(userId: string, listingId: string): Promise<void> {
    const result = await this.favoritesRepository.delete({
      user_id: userId,
      listing_id: listingId,
    });

    if (result.affected === 0) {
      throw new NotFoundException('errors.favoriteNotFound');
    }
  }

  async findAll(userId: string): Promise<Favorite[]> {
    return this.favoritesRepository.find({
      where: { user_id: userId },
      relations: [
        'listing',
        'listing.vehicle',
        'listing.vehicle.brand',
        'listing.vehicle.model',
        'listing.user',
      ],
      order: { created_at: 'DESC' },
    });
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
