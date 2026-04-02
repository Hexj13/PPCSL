import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ListingStatus as ListingStatusEnum } from '../../../common/types';
import { removePasswordFromUser } from '../../../common/utils/error-handling.utils';
import { Listing } from '../../entities/listing.entity';

@Injectable()
export class FindByVinUseCase {
  constructor(
    @InjectRepository(Listing)
    private readonly listingsRepository: Repository<Listing>,
  ) {}

  async execute(vin: string, excludeId?: string): Promise<Listing[]> {
    const queryBuilder = this.listingsRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.vehicle', 'vehicle')
      .leftJoinAndSelect('vehicle.brand', 'brand')
      .leftJoinAndSelect('vehicle.model', 'model')
      .where('listing.vin = :vin', { vin })
      .andWhere('listing.status = :status', { status: ListingStatusEnum.Closed })
      .orderBy('listing.updated_at', 'DESC');

    if (excludeId) {
      queryBuilder.andWhere('listing.id != :excludeId', { excludeId });
    }

    const listings = await queryBuilder.getMany();

    return listings.map((listing) => {
      (listing as Partial<Listing>).price = undefined;
      (listing as Partial<Listing>).currency = undefined;
      if (listing.user) {
        listing.user = removePasswordFromUser(listing.user) as typeof listing.user;
        listing.user.phone = null;
        listing.user.additionalPhone = null;
        listing.user.email = null;
        listing.user.firstName = null;
        listing.user.lastName = null;
        listing.user.companyName = null;
        listing.user.companyWebsiteUrl = null;
      }
      return listing;
    });
  }
}
