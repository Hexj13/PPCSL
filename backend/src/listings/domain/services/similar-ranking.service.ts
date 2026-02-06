export interface VehicleForRanking {
  brand_id?: string | null;
  model_id?: string | null;
  body_type?: string | null;
  year?: number | null;
  mileage_km?: number | null;
}

export interface ListingForRanking {
  id: string;
  user_id: string;
  price: number;
  city?: string | null;
  is_promoted?: boolean;
  promoted_until?: Date | string | null;
  last_updated_at: Date | string;
  vehicle?: VehicleForRanking | null;
}

export interface CurrentListingForRanking {
  price?: number | null;
  city?: string | null;
  vehicle?: VehicleForRanking | null;
}

interface ListingWithMetadata extends ListingForRanking {
  __bucket_priority: number;
  __same_city: number;
  __mileage_diff: number;
}

export class SimilarListingsRankingService {
  rank<T extends ListingForRanking>(current: CurrentListingForRanking, candidates: T[]): T[] {
    const { vehicle } = current;
    const { price, city } = current;
    const year = vehicle?.year;
    const mileage = vehicle?.mileage_km;
    const body_type = vehicle?.body_type;
    const brand_id = vehicle?.brand_id;
    const model_id = vehicle?.model_id;

    const yearRange = year && year < 2010 ? 3 : 5;
    const yearMin = year ? year - yearRange : null;
    const yearMax = year ? year + yearRange : null;
    const priceRange = price && price < 10000 ? 0.3 : 0.6;
    const priceMin = price ? price * (1 - priceRange) : null;
    const priceMax = price ? price * (1 + priceRange) : null;

    const currentCityNormalized = city ? city.trim().toLowerCase() : '';

    const withMetadata = candidates.map((listing): T & ListingWithMetadata => {
      const v = listing.vehicle;
      let bucketPriority = 6;

      if (v && brand_id && model_id && v.brand_id === brand_id && v.model_id === model_id) {
        if (
          yearMin !== null &&
          yearMax !== null &&
          v.year != null &&
          v.year >= yearMin &&
          v.year <= yearMax
        ) {
          bucketPriority = 1;
        }
      }

      if (
        bucketPriority === 6 &&
        v &&
        brand_id &&
        body_type &&
        v.brand_id === brand_id &&
        v.body_type === body_type
      ) {
        if (
          yearMin !== null &&
          yearMax !== null &&
          v.year != null &&
          v.year >= yearMin &&
          v.year <= yearMax &&
          priceMin !== null &&
          priceMax !== null &&
          listing.price >= priceMin &&
          listing.price <= priceMax
        ) {
          bucketPriority = 2;
        }
      }

      if (bucketPriority === 6 && v && body_type && v.body_type === body_type) {
        if (
          yearMin !== null &&
          yearMax !== null &&
          v.year != null &&
          v.year >= yearMin &&
          v.year <= yearMax &&
          priceMin !== null &&
          priceMax !== null &&
          listing.price >= priceMin &&
          listing.price <= priceMax
        ) {
          bucketPriority = 3;
        } else if (
          priceMin !== null &&
          priceMax !== null &&
          listing.price >= priceMin &&
          listing.price <= priceMax
        ) {
          bucketPriority = 4;
        }
      }

      if (
        bucketPriority === 6 &&
        v &&
        yearMin !== null &&
        yearMax !== null &&
        v.year != null &&
        v.year >= yearMin &&
        v.year <= yearMax &&
        priceMin !== null &&
        priceMax !== null &&
        listing.price >= priceMin &&
        listing.price <= priceMax
      ) {
        bucketPriority = 5;
      }

      const listingCityNormalized = listing.city ? listing.city.trim().toLowerCase() : '';
      const sameCity = listingCityNormalized === currentCityNormalized ? 1 : 0;

      let mileageDiff = Infinity;
      if (mileage != null && v?.mileage_km != null) {
        mileageDiff = Math.abs(v.mileage_km - mileage);
      }

      return {
        ...listing,
        __bucket_priority: bucketPriority,
        __same_city: sameCity,
        __mileage_diff: mileageDiff,
      } as T & ListingWithMetadata;
    });

    const now = new Date();
    withMetadata.sort((a, b) => {
      if (a.__bucket_priority !== b.__bucket_priority) {
        return a.__bucket_priority - b.__bucket_priority;
      }
      const isActivelyPromotedA =
        a.is_promoted && (!a.promoted_until || new Date(a.promoted_until) > now);
      const isActivelyPromotedB =
        b.is_promoted && (!b.promoted_until || new Date(b.promoted_until) > now);
      const promotedA = isActivelyPromotedA ? 1 : 0;
      const promotedB = isActivelyPromotedB ? 1 : 0;
      if (promotedA !== promotedB) {
        return promotedB - promotedA;
      }
      if (a.__same_city !== b.__same_city) {
        return b.__same_city - a.__same_city;
      }
      if (a.__mileage_diff !== b.__mileage_diff) {
        return a.__mileage_diff - b.__mileage_diff;
      }
      return new Date(b.last_updated_at).getTime() - new Date(a.last_updated_at).getTime();
    });

    return withMetadata.map(
      ({ __bucket_priority, __same_city, __mileage_diff, ...listing }) => listing as T,
    );
  }

  diversifyBySeller<T extends { user_id: string }>(listings: T[], maxPerSeller: number): T[] {
    const sellerCount = new Map<string, number>();
    const result: T[] = [];

    for (const listing of listings) {
      const sellerId = listing.user_id;
      const count = sellerCount.get(sellerId) || 0;
      if (count < maxPerSeller) {
        result.push(listing);
        sellerCount.set(sellerId, count + 1);
      }
      if (result.length >= 8) {
        break;
      }
    }
    return result;
  }
}
