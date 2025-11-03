import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from './entities/favorite.entity';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private favoritesRepository: Repository<Favorite>,
  ) {}

  async add(userId: string, listingId: string): Promise<Favorite> {
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
      throw new NotFoundException('Омилената објава не е пронајдена');
    }
  }

  async findAll(userId: string): Promise<Favorite[]> {
    return this.favoritesRepository.find({
      where: { user_id: userId },
      relations: ['listing', 'listing.vehicle', 'listing.vehicle.brand', 'listing.vehicle.model', 'listing.user'],
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
}
