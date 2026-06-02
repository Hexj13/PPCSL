import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ExchangeRatesService } from '../../../exchange-rates/exchange-rates.service';
import { ListingPublicViewMapper } from '../../../listings/application/mappers/listing-public-view.mapper';
import { maskClosedListingForPublicView } from '../../../listings/application/utils/mask-closed-listing-for-public-view';
import { Listing } from '../../../listings/entities/listing.entity';
import {
  applyListingCardSelects,
  attachHasVideoFromRaw,
} from '../../../listings/infrastructure/persistence/listing-card-query.utils';
import { Favorite } from '../../entities/favorite.entity';

@Injectable()
export class ListFavoritesUseCase {
  constructor(
    @InjectRepository(Favorite)
    private readonly favoritesRepository: Repository<Favorite>,
    @InjectRepository(Listing)
    private readonly listingsRepository: Repository<Listing>,
    private readonly exchangeRatesService: ExchangeRatesService,
    private readonly listingPublicViewMapper: ListingPublicViewMapper,
  ) {}

  async execute(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: Favorite[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const skip = (page - 1) * limit;

    const [favorites, total] = await this.favoritesRepository.findAndCount({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      skip,
      take: limit,
    });

    const listingIds = favorites.map((favorite) => favorite.listing_id);
    if (listingIds.length === 0) {
      return {
        data: favorites,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    const { entities, raw } = await applyListingCardSelects(
      this.listingsRepository.createQueryBuilder('listing'),
    )
      .where('listing.id IN (:...listingIds)', { listingIds })
      .getRawAndEntities();

    attachHasVideoFromRaw(entities, raw);

    const masked = this.listingPublicViewMapper.toListViews(entities);
    const enriched = await this.exchangeRatesService.enrichListingsWithApproxPrice(masked);
    const enrichedMap = new Map(enriched.map((listing) => [listing.id, listing]));

    const data = favorites.map((favorite) => {
      const listing = enrichedMap.get(favorite.listing_id);
      if (listing) {
        maskClosedListingForPublicView(listing);
        favorite.listing = listing;
      }
      return favorite;
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
}
