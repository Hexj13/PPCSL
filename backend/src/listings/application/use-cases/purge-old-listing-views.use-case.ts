import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ListingView } from '../../entities/listing-view.entity';

export const LISTING_VIEWS_RETENTION_MONTHS = 12;

@Injectable()
export class PurgeOldListingViewsUseCase {
  constructor(
    @InjectRepository(ListingView)
    private readonly listingViewRepository: Repository<ListingView>,
  ) {}

  async execute(): Promise<{ deleted: number }> {
    const result = await this.listingViewRepository
      .createQueryBuilder()
      .delete()
      .from(ListingView)
      .where(`created_at < now() - (:months * interval '1 month')`, {
        months: LISTING_VIEWS_RETENTION_MONTHS,
      })
      .execute();
    return { deleted: result.affected ?? 0 };
  }
}
