import { In, Like } from 'typeorm';

import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { ComparisonItem } from '../comparison/entities/comparison-item.entity';
import { AppDataSource } from '../data-source';
import { Favorite } from '../favorites/entities/favorite.entity';
import { ListingView } from '../listings/entities/listing-view.entity';
import { Listing } from '../listings/entities/listing.entity';
import { PromotionHistory } from '../listings/entities/promotion-history.entity';
import { Vehicle } from '../listings/entities/vehicle.entity';
import { SavedFilter } from '../saved-filters/entities/saved-filter.entity';
import { Tire } from '../tires/entities/tire.entity';
import { User } from '../users/entities/user.entity';

const TEST_PASSWORD = 'Test123!@#';
const TEST_RUN_ID =
  process.env.KUPITO_TEST_RUN_ID || `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
const TEST_EMAIL_PREFIX = `it-${TEST_RUN_ID}`;
let phoneSequence = 0;

export type TestCredentials = {
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
};

function nextPhone(): string {
  phoneSequence += 1;
  const suffix = `${Date.now()}${phoneSequence}${Math.floor(Math.random() * 1000)}`.slice(-7);
  return `+38979${suffix}`;
}

export function createTestCredentials(scope: string): TestCredentials {
  const normalizedScope = scope.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
  const randomPart = Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, '0');

  return {
    email: `${TEST_EMAIL_PREFIX}-${normalizedScope}-${randomPart}@example.com`,
    phone: nextPhone(),
    password: TEST_PASSWORD,
    firstName: 'Test',
    lastName: 'User',
  };
}

export async function cleanupIntegrationTestData(): Promise<void> {
  let initializedHere = false;

  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
    initializedHere = true;
  }

  try {
    const userRepo = AppDataSource.getRepository(User);
    const listingRepo = AppDataSource.getRepository(Listing);
    const vehicleRepo = AppDataSource.getRepository(Vehicle);
    const tireRepo = AppDataSource.getRepository(Tire);
    const listingViewRepo = AppDataSource.getRepository(ListingView);
    const favoriteRepo = AppDataSource.getRepository(Favorite);
    const comparisonRepo = AppDataSource.getRepository(ComparisonItem);
    const promotionHistoryRepo = AppDataSource.getRepository(PromotionHistory);
    const savedFilterRepo = AppDataSource.getRepository(SavedFilter);
    const refreshTokenRepo = AppDataSource.getRepository(RefreshToken);

    const users = await userRepo.find({
      where: { email: Like(`${TEST_EMAIL_PREFIX}%`) },
      select: ['id'],
    });

    if (users.length === 0) {
      return;
    }

    const userIds = users.map((user) => user.id);
    const listings = await listingRepo.find({
      where: { user_id: In(userIds) },
      select: ['id', 'vehicle_id', 'tire_id'],
    });
    const listingIds = listings.map((listing) => listing.id);
    const vehicleIds = listings
      .map((listing) => listing.vehicle_id)
      .filter((vehicleId): vehicleId is string => vehicleId !== null);
    const tireIds = listings
      .map((listing) => listing.tire_id)
      .filter((tireId): tireId is string => tireId !== null);

    if (listingIds.length > 0) {
      await listingViewRepo.delete({ listing_id: In(listingIds) });
      await favoriteRepo.delete({ listing_id: In(listingIds) });
      await comparisonRepo.delete({ listing_id: In(listingIds) });
      await promotionHistoryRepo.delete({ listing_id: In(listingIds) });
      await listingRepo.delete({ id: In(listingIds) });
    }

    await comparisonRepo.delete({ user_id: In(userIds) });
    await savedFilterRepo.delete({ user_id: In(userIds) });
    await favoriteRepo.delete({ user_id: In(userIds) });
    await promotionHistoryRepo.delete({ user_id: In(userIds) });
    await refreshTokenRepo.delete({ user_id: In(userIds) });

    if (vehicleIds.length > 0) {
      await vehicleRepo.delete({ id: In(vehicleIds) });
    }

    if (tireIds.length > 0) {
      await tireRepo.delete({ id: In(tireIds) });
    }

    await userRepo.delete({ id: In(userIds) });
  } finally {
    if (initializedHere && AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}
