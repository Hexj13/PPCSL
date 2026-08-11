import { Inject, Injectable } from '@nestjs/common';

import type { ModelIndexData } from '../../domain/model-index.types';
import { IListingCache, LISTING_CACHE } from '../ports/listing-cache.port';
import { IListingRepository, LISTING_REPOSITORY } from '../ports/listing.repository.port';

@Injectable()
export class GetModelIndexUseCase {
  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listingRepo: IListingRepository,
    @Inject(LISTING_CACHE)
    private readonly listingCache: IListingCache,
  ) {}

  async execute(): Promise<ModelIndexData> {
    const cached = await this.listingCache.getModelIndex();
    if (cached) {
      return cached;
    }

    const items = await this.listingRepo.getModelIndexAggregates();
    const data: ModelIndexData = {
      generatedAt: new Date().toISOString(),
      items,
    };
    await this.listingCache.setModelIndex(data);
    return data;
  }
}
