import type { SelectQueryBuilder } from 'typeorm';

import type { Listing } from '../../entities/listing.entity';

import {
  LISTING_CARD_BRAND_FIELDS,
  LISTING_CARD_LISTING_FIELDS,
  LISTING_CARD_MODEL_FIELDS,
  LISTING_CARD_TIRE_BRAND_FIELDS,
  LISTING_CARD_TIRE_FIELDS,
  LISTING_CARD_TIRE_MODEL_FIELDS,
  LISTING_CARD_USER_FIELDS,
  LISTING_CARD_VEHICLE_FIELDS,
  LISTING_HAS_VIDEO_SELECT,
} from './listing-list-projection';

export function applyListingCardSelects(
  qb: SelectQueryBuilder<Listing>,
): SelectQueryBuilder<Listing> {
  return qb
    .select([...LISTING_CARD_LISTING_FIELDS])
    .addSelect(LISTING_HAS_VIDEO_SELECT, 'has_video')
    .leftJoin('listing.vehicle', 'vehicle')
    .addSelect([...LISTING_CARD_VEHICLE_FIELDS])
    .leftJoin('vehicle.brand', 'brand')
    .addSelect([...LISTING_CARD_BRAND_FIELDS])
    .leftJoin('vehicle.model', 'model')
    .addSelect([...LISTING_CARD_MODEL_FIELDS])
    .leftJoin('listing.user', 'user')
    .addSelect([...LISTING_CARD_USER_FIELDS]);
}

export function applyTireJoins(qb: SelectQueryBuilder<Listing>): SelectQueryBuilder<Listing> {
  return qb
    .leftJoin('listing.tire', 'tire')
    .addSelect([...LISTING_CARD_TIRE_FIELDS])
    .leftJoin('tire.brand', 'tireBrand')
    .addSelect([...LISTING_CARD_TIRE_BRAND_FIELDS])
    .leftJoin('tire.model', 'tireModel')
    .addSelect([...LISTING_CARD_TIRE_MODEL_FIELDS]);
}

export function applyTireCardSelects(qb: SelectQueryBuilder<Listing>): SelectQueryBuilder<Listing> {
  return applyTireJoins(
    qb
      .select([...LISTING_CARD_LISTING_FIELDS])
      .addSelect(LISTING_HAS_VIDEO_SELECT, 'has_video')
      .leftJoin('listing.user', 'user')
      .addSelect([...LISTING_CARD_USER_FIELDS]),
  );
}

export function applyOwnerListingCardSelects(
  qb: SelectQueryBuilder<Listing>,
): SelectQueryBuilder<Listing> {
  return applyTireJoins(applyListingCardSelects(qb));
}

export function attachHasVideoFromRaw(entities: Listing[], raw: Record<string, unknown>[]): void {
  entities.forEach((entity, index) => {
    const value = raw[index]?.has_video;
    const hasVideo = value === true || value === 'true' || value === 1 || value === '1';
    (entity as Listing & { has_video?: boolean }).has_video = hasVideo;
  });
}

export async function getListingCardEntities(qb: SelectQueryBuilder<Listing>): Promise<Listing[]> {
  const { entities, raw } = await qb.getRawAndEntities();
  attachHasVideoFromRaw(entities, raw);
  return entities;
}

export async function getListingCardPage(
  qb: SelectQueryBuilder<Listing>,
  skip: number,
  take: number,
): Promise<Listing[]> {
  const { entities, raw } = await qb.skip(skip).take(take).getRawAndEntities();
  attachHasVideoFromRaw(entities, raw);
  return entities;
}
