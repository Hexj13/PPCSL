import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { AddFavoriteUseCase } from './application/use-cases/add-favorite.use-case';
import { ListFavoritesUseCase } from './application/use-cases/list-favorites.use-case';
import { RemoveFavoriteUseCase } from './application/use-cases/remove-favorite.use-case';
import { Favorite } from './entities/favorite.entity';

@Injectable()
export class FavoritesService {
  constructor(
    private readonly addFavoriteUseCase: AddFavoriteUseCase,
    private readonly removeFavoriteUseCase: RemoveFavoriteUseCase,
    private readonly listFavoritesUseCase: ListFavoritesUseCase,
    @InjectRepository(Favorite)
    private readonly favoritesRepository: Repository<Favorite>,
  ) {}

  add(userId: string, listingId: string): Promise<Favorite> {
    return this.addFavoriteUseCase.execute(userId, listingId);
  }

  remove(userId: string, listingId: string): Promise<void> {
    return this.removeFavoriteUseCase.execute(userId, listingId);
  }

  findAll(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): ReturnType<ListFavoritesUseCase['execute']> {
    return this.listFavoritesUseCase.execute(userId, page, limit);
  }

  async checkIfFavorite(userId: string, listingId: string): Promise<boolean> {
    const favorite = await this.favoritesRepository.findOne({
      where: { user_id: userId, listing_id: listingId },
    });
    return Boolean(favorite);
  }

  async getUserFavoriteIds(userId: string): Promise<string[]> {
    const favorites = await this.favoritesRepository.find({
      where: { user_id: userId },
      select: ['listing_id'],
    });
    return favorites.map((favorite) => favorite.listing_id);
  }

  async checkBatch(userId: string, listingIds: string[]): Promise<Record<string, boolean>> {
    if (!listingIds?.length) {
      return {};
    }
    const favorites = await this.favoritesRepository.find({
      where: { user_id: userId, listing_id: In(listingIds) },
      select: ['listing_id'],
    });
    const favoriteSet = new Set(favorites.map((favorite) => favorite.listing_id));
    return Object.fromEntries(listingIds.map((id) => [id, favoriteSet.has(id)]));
  }
}
