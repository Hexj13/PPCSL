export interface VehicleForRanking {
  brand_id?: string | null;
  model_id?: string | null;
  body_type?: string | null;
  year?: number | null;
  mileage_km?: number | null;
  fuel?: string | null;
  transmission?: string | null;
  drive_type?: string | null;
  engine_displ_l?: number | null;
}

export interface ListingForRanking {
  id: string;
  user_id: string;
  price: number;
  currency?: string | null;
  is_new?: boolean;
  condition?: string | null;
  city?: string | null;
  is_promoted?: boolean;
  promoted_until?: Date | string | null;
  last_updated_at: Date | string;
  vehicle?: VehicleForRanking | null;
}

export interface CurrentListingForRanking {
  price?: number | null;
  currency?: string | null;
  is_new?: boolean;
  condition?: string | null;
  city?: string | null;
  vehicle?: VehicleForRanking | null;
}

interface ListingWithMetadata extends ListingForRanking {
  __bucket_priority: number;
  __same_city: number;
  __mileage_diff: number;
  __fuel_match: number;
  __transmission_match: number;
  __drive_type_match: number;
  __engine_diff: number;
  __is_new_match: number;
  __condition_match: number;
}

export class SimilarListingsRankingService {
  rank<T extends ListingForRanking>(
    current: CurrentListingForRanking,
    candidates: T[],
    currencyContext?: {
      defaultCurrency: string;
      rates: Record<string, number>;
    },
  ): T[] {
    const { vehicle } = current;
    const { price, city } = current;
    const year = vehicle?.year;
    const mileage = vehicle?.mileage_km;
    const body_type = vehicle?.body_type;
    const brand_id = vehicle?.brand_id;
    const model_id = vehicle?.model_id;
    const fuel = vehicle?.fuel;
    const transmission = vehicle?.transmission;
    const drive_type = vehicle?.drive_type;
    const engineDisplacement = vehicle?.engine_displ_l;
    const currentCondition = current.condition;
    const currentIsNew = current.is_new;

    const currentPriceNormalized = this.normalizeToDefaultCurrency(
      price ?? null,
      current.currency ?? null,
      currencyContext,
    );

    const yearRange = year && year < 2010 ? 3 : 5;
    const yearMin = year ? year - yearRange : null;
    const yearMax = year ? year + yearRange : null;
    const priceRange = currentPriceNormalized && currentPriceNormalized < 10000 ? 0.3 : 0.6;
    const priceMin = currentPriceNormalized ? currentPriceNormalized * (1 - priceRange) : null;
    const priceMax = currentPriceNormalized ? currentPriceNormalized * (1 + priceRange) : null;

    const currentCityNormalized = city ? city.trim().toLowerCase() : '';

    const withMetadata = candidates.map((listing): T & ListingWithMetadata => {
      const v = listing.vehicle;
      const listingPriceNormalized = this.normalizeToDefaultCurrency(
        listing.price,
        listing.currency ?? null,
        currencyContext,
      );
      let bucketPriority = 7;

      if (v && brand_id && model_id && v.brand_id === brand_id && v.model_id === model_id) {
        if (
          yearMin !== null &&
          yearMax !== null &&
          v.year != null &&
          v.year >= yearMin &&
          v.year <= yearMax
        ) {
          bucketPriority = 1;
        } else {
          bucketPriority = 2;
        }
      }

      if (
        bucketPriority === 7 &&
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
          listingPriceNormalized !== null &&
          listingPriceNormalized >= priceMin &&
          listingPriceNormalized <= priceMax
        ) {
          bucketPriority = 3;
        }
      }

      if (bucketPriority === 7 && v && body_type && v.body_type === body_type) {
        if (
          yearMin !== null &&
          yearMax !== null &&
          v.year != null &&
          v.year >= yearMin &&
          v.year <= yearMax &&
          priceMin !== null &&
          priceMax !== null &&
          listingPriceNormalized !== null &&
          listingPriceNormalized >= priceMin &&
          listingPriceNormalized <= priceMax
        ) {
          bucketPriority = 4;
        } else if (
          priceMin !== null &&
          priceMax !== null &&
          listingPriceNormalized !== null &&
          listingPriceNormalized >= priceMin &&
          listingPriceNormalized <= priceMax
        ) {
          bucketPriority = 5;
        }
      }

      if (
        bucketPriority === 7 &&
        v &&
        yearMin !== null &&
        yearMax !== null &&
        v.year != null &&
        v.year >= yearMin &&
        v.year <= yearMax &&
        priceMin !== null &&
        priceMax !== null &&
        listingPriceNormalized !== null &&
        listingPriceNormalized >= priceMin &&
        listingPriceNormalized <= priceMax
      ) {
        bucketPriority = 6;
      }

      const listingCityNormalized = listing.city ? listing.city.trim().toLowerCase() : '';
      const sameCity = listingCityNormalized === currentCityNormalized ? 1 : 0;

      let mileageDiff = Infinity;
      if (mileage != null && v?.mileage_km != null) {
        mileageDiff = Math.abs(v.mileage_km - mileage);
      }
      const fuelMatch = fuel && v?.fuel && v.fuel === fuel ? 1 : 0;
      const transmissionMatch =
        transmission && v?.transmission && v.transmission === transmission ? 1 : 0;
      const driveTypeMatch = drive_type && v?.drive_type && v.drive_type === drive_type ? 1 : 0;
      const engineDiff =
        engineDisplacement != null && v?.engine_displ_l != null
          ? Math.abs(v.engine_displ_l - engineDisplacement)
          : Infinity;
      const isNewMatch =
        currentIsNew !== undefined &&
        listing.is_new !== undefined &&
        listing.is_new === currentIsNew
          ? 1
          : 0;
      const conditionMatch =
        currentCondition && listing.condition && listing.condition === currentCondition ? 1 : 0;

      return {
        ...listing,
        __bucket_priority: bucketPriority,
        __same_city: sameCity,
        __mileage_diff: mileageDiff,
        __fuel_match: fuelMatch,
        __transmission_match: transmissionMatch,
        __drive_type_match: driveTypeMatch,
        __engine_diff: engineDiff,
        __is_new_match: isNewMatch,
        __condition_match: conditionMatch,
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
      if (a.__fuel_match !== b.__fuel_match) {
        return b.__fuel_match - a.__fuel_match;
      }
      if (a.__transmission_match !== b.__transmission_match) {
        return b.__transmission_match - a.__transmission_match;
      }
      if (a.__drive_type_match !== b.__drive_type_match) {
        return b.__drive_type_match - a.__drive_type_match;
      }
      if (a.__condition_match !== b.__condition_match) {
        return b.__condition_match - a.__condition_match;
      }
      if (a.__is_new_match !== b.__is_new_match) {
        return b.__is_new_match - a.__is_new_match;
      }
      if (a.__engine_diff !== b.__engine_diff) {
        return a.__engine_diff - b.__engine_diff;
      }
      if (a.__mileage_diff !== b.__mileage_diff) {
        return a.__mileage_diff - b.__mileage_diff;
      }
      return new Date(b.last_updated_at).getTime() - new Date(a.last_updated_at).getTime();
    });

    return withMetadata.map(
      ({
        __bucket_priority,
        __same_city,
        __mileage_diff,
        __fuel_match,
        __transmission_match,
        __drive_type_match,
        __engine_diff,
        __is_new_match,
        __condition_match,
        ...listing
      }) => listing as T,
    );
  }

  private normalizeToDefaultCurrency(
    price: number | null,
    currency: string | null,
    currencyContext?: {
      defaultCurrency: string;
      rates: Record<string, number>;
    },
  ): number | null {
    if (price == null) {
      return null;
    }
    if (!currencyContext || !currency || currency === currencyContext.defaultCurrency) {
      return price;
    }
    const rate = currencyContext.rates[currency];
    if (!rate) {
      return null;
    }
    return Math.round(price / rate);
  }
}
