import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ListingStatus as ListingStatusEnum } from '../../../common/types';
import { Listing } from '../../entities/listing.entity';

@Injectable()
export class GetActiveUserListingsUseCase {
  constructor(
    @InjectRepository(Listing)
    private readonly listingsRepository: Repository<Listing>,
  ) {}

  async execute(userId: string): Promise<Listing[]> {
    return this.listingsRepository.find({
      where: { user_id: userId, status: ListingStatusEnum.Active },
      relations: ['vehicle', 'vehicle.brand', 'vehicle.model'],
      order: { is_promoted: 'DESC', created_at: 'DESC' },
    });
  }
}
