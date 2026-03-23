import { Inject, Injectable } from '@nestjs/common';

import * as constants from '../../../common/constants';
import { ListingStatus as ListingStatusEnum } from '../../../common/types';
import { ExchangeRatesService } from '../../../exchange-rates/exchange-rates.service';
import { SimilarListingsRankingService } from '../../domain/services/similar-ranking.service';
import { Listing } from '../../entities/listing.entity';
import { IListingCache, LISTING_CACHE } from '../ports/listing-cache.port';
import { IListingRepository, LISTING_REPOSITORY } from '../ports/listing.repository.port';

type ListingData = Omit<
  Listing,
  | 'isActive'
  | 'isPromoted'
  | 'canBeEdited'
  | 'canBePublished'
  | 'publish'
  | 'pause'
  | 'close'
  | 'startPromotion'
  | 'pausePromotion'
  | 'resumePromotion'
  | 'stopPromotion'
>;

@Injectable()
export class FindSimilarUseCase {
  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listingRepo: IListingRepository,
    @Inject(LISTING_CACHE)
    private readonly listingCache: IListingCache,
    private readonly similarRankingService: SimilarListingsRankingService,
    private readonly exchangeRatesService: ExchangeRatesService,
  ) {}

  async execute(listingId: string, limit: number = 4, offset: number = 0): Promise<ListingData[]> {
    const normalizedLimit = Math.min(Math.max(1, limit || 4), 8);
    const normalizedOffset = Math.max(0, offset || 0);

    const current = await this.listingRepo.findById(listingId);
    if (!current || current.status !== ListingStatusEnum.Active) {
      return [];
    }

    const cached = await this.listingCache.getSimilarResults(listingId);
    if (cached) {
      const enriched = await this.exchangeRatesService.enrichListingsWithApproxPrice(cached);
      return enriched.slice(normalizedOffset, normalizedOffset + normalizedLimit) as ListingData[];
    }

    const ratesMap = await this.exchangeRatesService.getAllRatesMap();
    const currencyContext = {
      defaultCurrency: ratesMap.defaultCurrency || constants.getDefaultCurrency(),
      rates: ratesMap.rates,
    };
    const candidates = await this.listingRepo.findSimilarCandidates(current, currencyContext);
    const ranked = this.similarRankingService.rank(
      {
        price: current.price,
        currency: current.currency,
        is_new: current.is_new,
        condition: current.condition,
        city: current.city,
        vehicle: current.vehicle
          ? {
              brand_id: current.vehicle.brand_id,
              model_id: current.vehicle.model_id,
              body_type: current.vehicle.body_type,
              year: current.vehicle.year,
              mileage_km: current.vehicle.mileage_km,
              fuel: current.vehicle.fuel,
              transmission: current.vehicle.transmission,
              drive_type: current.vehicle.drive_type,
              engine_displ_l: current.vehicle.engine_displ_l,
            }
          : null,
      },
      candidates as ListingData[],
      currencyContext,
    );
    const result = ranked.slice(0, 8);

    await this.listingCache.setSimilarResults(listingId, result as Listing[]);

    const enriched = await this.exchangeRatesService.enrichListingsWithApproxPrice(
      result as Listing[],
    );
    return enriched.slice(normalizedOffset, normalizedOffset + normalizedLimit) as ListingData[];
  }
}
