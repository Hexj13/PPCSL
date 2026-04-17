import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ListingStatus as ListingStatusEnum } from '../../../common/types';
import { Listing } from '../../entities/listing.entity';

@Injectable()
export class GetActiveUserListingsCountUseCase {
  constructor(
    @InjectRepository(Listing)
    private readonly listingsRepository: Repository<Listing>,
  ) {}

  async execute(userId: string): Promise<number> {
    return this.listingsRepository.count({
      where: { user_id: userId, status: ListingStatusEnum.Active },
    });
  }
}
