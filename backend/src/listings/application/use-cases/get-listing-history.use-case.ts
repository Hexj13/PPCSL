import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { Listing } from '../../entities/listing.entity';
import { IListingRepository, LISTING_REPOSITORY } from '../ports/listing.repository.port';

import { FindByVinUseCase } from './find-by-vin.use-case';

@Injectable()
export class GetListingHistoryUseCase {
  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listingRepo: IListingRepository,
    private readonly findByVinUseCase: FindByVinUseCase,
  ) {}

  async execute(listingId: string): Promise<Listing[]> {
    const listing = await this.listingRepo.findById(listingId);
    if (!listing) {
      throw new NotFoundException('errors.listingNotFound');
    }
    if (!listing.vin?.trim()) {
      return [];
    }
    return this.findByVinUseCase.execute(listing.vin.trim(), listingId);
  }
}
