import { In, type Repository } from 'typeorm';

import { ListingCategory, ListingStatus } from '../../../../common/constants';
import type { Listing } from '../../../../listings/entities/listing.entity';

export async function loadUserVehicleListingsForDedupe(
  listingRepo: Repository<Listing>,
  userId: string,
): Promise<Listing[]> {
  const rows = await listingRepo.find({
    where: {
      user_id: userId,
      category: ListingCategory.Vehicle,
      status: In([ListingStatus.Active, ListingStatus.Paused, ListingStatus.Closed]),
    },
    relations: ['vehicle'],
  });
  return rows.filter((l) => l.vehicle_id && l.vehicle);
}
