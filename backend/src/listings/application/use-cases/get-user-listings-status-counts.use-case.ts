import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';

import { ListingStatus as ListingStatusEnum } from '../../../common/types';
import { Listing } from '../../entities/listing.entity';

@Injectable()
export class GetUserListingsStatusCountsUseCase {
  constructor(
    @InjectRepository(Listing)
    private readonly listingsRepository: Repository<Listing>,
  ) {}

  async execute(
    userId: string,
    search?: string,
  ): Promise<{
    Active: number;
    Paused: number;
    Closed: number;
    Promoted: number;
  }> {
    const searchQuery = search?.trim();

    const qb = this.listingsRepository
      .createQueryBuilder('listing')
      .select(`COUNT(*) FILTER (WHERE listing.status = :activeStatus)`, 'Active')
      .addSelect(`COUNT(*) FILTER (WHERE listing.status = :pausedStatus)`, 'Paused')
      .addSelect(`COUNT(*) FILTER (WHERE listing.status = :closedStatus)`, 'Closed')
      .addSelect(`COUNT(*) FILTER (WHERE listing.is_promoted = :isPromoted)`, 'Promoted')
      .setParameters({
        activeStatus: ListingStatusEnum.Active,
        pausedStatus: ListingStatusEnum.Paused,
        closedStatus: ListingStatusEnum.Closed,
        isPromoted: true,
        userId,
      })
      .where('listing.user_id = :userId');

    if (searchQuery) {
      qb.leftJoin('listing.vehicle', 'vehicle')
        .leftJoin('vehicle.brand', 'brand')
        .leftJoin('vehicle.model', 'model')
        .andWhere(
          new Brackets((searchQb) => {
            searchQb
              .where('brand.name ILIKE :search', { search: `%${searchQuery}%` })
              .orWhere('model.name ILIKE :search', { search: `%${searchQuery}%` });
          }),
        );
    }

    const raw = await qb.getRawOne<{
      Active?: string | number | null;
      Paused?: string | number | null;
      Closed?: string | number | null;
      Promoted?: string | number | null;
    }>();

    return {
      Active: Number(raw?.Active ?? 0),
      Paused: Number(raw?.Paused ?? 0),
      Closed: Number(raw?.Closed ?? 0),
      Promoted: Number(raw?.Promoted ?? 0),
    };
  }
}
