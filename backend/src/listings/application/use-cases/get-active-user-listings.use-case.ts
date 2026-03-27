import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ListingStatus as ListingStatusEnum } from '../../../common/types';
import { ExchangeRatesService } from '../../../exchange-rates/exchange-rates.service';
import { Listing } from '../../entities/listing.entity';

@Injectable()
export class GetActiveUserListingsUseCase {
  constructor(
    @InjectRepository(Listing)
    private readonly listingsRepository: Repository<Listing>,
    private readonly exchangeRatesService: ExchangeRatesService,
  ) {}

  async execute(userId: string): Promise<Listing[]> {
    const listings = await this.listingsRepository.find({
      where: { user_id: userId, status: ListingStatusEnum.Active },
      relations: ['vehicle', 'vehicle.brand', 'vehicle.model', 'tire', 'tire.brand', 'tire.model'],
      order: { is_promoted: 'DESC', created_at: 'DESC' },
    });
    return this.exchangeRatesService.enrichListingsWithApproxPrice(listings);
  }
}
