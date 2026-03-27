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

export interface TireForRanking {
  brand_id?: string | null;
  model_id?: string | null;
  tire_vehicle_type?: string | null;
  season?: string | null;
  condition?: string | null;
  width_mm?: number | null;
  aspect_ratio?: number | null;
  diameter_inch?: number | null;
  quantity?: number | null;
  studded?: boolean | null;
  run_flat?: boolean | null;
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
  tire?: TireForRanking | null;
}

export interface CurrentListingForRanking {
  price?: number | null;
  currency?: string | null;
  is_new?: boolean;
  condition?: string | null;
  city?: string | null;
  vehicle?: VehicleForRanking | null;
  tire?: TireForRanking | null;
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

interface TireListingWithMetadata extends ListingForRanking {
  __bucket_priority: number;
  __same_city: number;
  __tire_vehicle_type_match: number;
  __season_match: number;
  __tire_condition_match: number;
  __listing_condition_match: number;
  __quantity_diff: number;
  __stud_match: number;
  __run_flat_match: number;
  __price_norm_diff: number;
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
    if (current.tire?.width_mm != null) {
      return this.rankTireListings(current, candidates, currencyContext);
    }

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

  private rankTireListings<T extends ListingForRanking>(
    current: CurrentListingForRanking,
    candidates: T[],
    currencyContext?: {
      defaultCurrency: string;
      rates: Record<string, number>;
    },
  ): T[] {
    const t = current.tire!;
    const { city } = current;
    const currentCondition = current.condition;
    const currentCityNormalized = city ? city.trim().toLowerCase() : '';

    const currentPriceNormalized = this.normalizeToDefaultCurrency(
      current.price ?? null,
      current.currency ?? null,
      currencyContext,
    );

    const withMetadata = candidates.map((listing): T & TireListingWithMetadata => {
      const ct = listing.tire;
      let bucketPriority = 7;

      if (ct) {
        const exactSize =
          ct.width_mm === t.width_mm &&
          ct.aspect_ratio === t.aspect_ratio &&
          Number(ct.diameter_inch) === Number(t.diameter_inch);
        const brandMatch = !!t.brand_id && ct.brand_id === t.brand_id;
        const modelMatch = !!t.model_id && !!ct.model_id && ct.model_id === t.model_id;

        if (exactSize && brandMatch && modelMatch) {
          bucketPriority = 1;
        } else if (exactSize && brandMatch) {
          bucketPriority = 2;
        } else if (exactSize) {
          bucketPriority = 3;
        } else if (brandMatch && modelMatch) {
          bucketPriority = 4;
        } else if (brandMatch) {
          bucketPriority = 5;
        }
      }

      const tireVehicleTypeMatch =
        !!t.tire_vehicle_type &&
        !!ct?.tire_vehicle_type &&
        ct.tire_vehicle_type === t.tire_vehicle_type
          ? 1
          : 0;
      const listingCityNormalized = listing.city ? listing.city.trim().toLowerCase() : '';
      const sameCity = listingCityNormalized === currentCityNormalized ? 1 : 0;

      const seasonMatch = t.season && ct?.season && ct.season === t.season ? 1 : 0;
      const tireConditionMatch =
        t.condition && ct?.condition && ct.condition === t.condition ? 1 : 0;
      const listingConditionMatch =
        currentCondition && listing.condition && listing.condition === currentCondition ? 1 : 0;

      let quantityDiff = Number.POSITIVE_INFINITY;
      if (t.quantity != null && ct?.quantity != null) {
        quantityDiff = Math.abs(ct.quantity - t.quantity);
      }

      const studMatch =
        t.studded != null && ct?.studded != null && ct.studded === t.studded ? 1 : 0;
      const runFlatMatch =
        t.run_flat != null && ct?.run_flat != null && ct.run_flat === t.run_flat ? 1 : 0;

      const listingPriceNormalized = this.normalizeToDefaultCurrency(
        listing.price,
        listing.currency ?? null,
        currencyContext,
      );
      let priceNormDiff = Number.POSITIVE_INFINITY;
      if (currentPriceNormalized != null && listingPriceNormalized != null) {
        priceNormDiff = Math.abs(listingPriceNormalized - currentPriceNormalized);
      }

      return {
        ...listing,
        __bucket_priority: bucketPriority,
        __same_city: sameCity,
        __tire_vehicle_type_match: tireVehicleTypeMatch,
        __season_match: seasonMatch,
        __tire_condition_match: tireConditionMatch,
        __listing_condition_match: listingConditionMatch,
        __quantity_diff: quantityDiff,
        __stud_match: studMatch,
        __run_flat_match: runFlatMatch,
        __price_norm_diff: priceNormDiff,
      } as T & TireListingWithMetadata;
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
      if (a.__tire_vehicle_type_match !== b.__tire_vehicle_type_match) {
        return b.__tire_vehicle_type_match - a.__tire_vehicle_type_match;
      }
      if (a.__same_city !== b.__same_city) {
        return b.__same_city - a.__same_city;
      }
      if (a.__season_match !== b.__season_match) {
        return b.__season_match - a.__season_match;
      }
      if (a.__tire_condition_match !== b.__tire_condition_match) {
        return b.__tire_condition_match - a.__tire_condition_match;
      }
      if (a.__listing_condition_match !== b.__listing_condition_match) {
        return b.__listing_condition_match - a.__listing_condition_match;
      }
      if (a.__quantity_diff !== b.__quantity_diff) {
        return a.__quantity_diff - b.__quantity_diff;
      }
      if (a.__stud_match !== b.__stud_match) {
        return b.__stud_match - a.__stud_match;
      }
      if (a.__run_flat_match !== b.__run_flat_match) {
        return b.__run_flat_match - a.__run_flat_match;
      }
      if (a.__price_norm_diff !== b.__price_norm_diff) {
        return a.__price_norm_diff - b.__price_norm_diff;
      }
      return new Date(b.last_updated_at).getTime() - new Date(a.last_updated_at).getTime();
    });

    return withMetadata.map(
      ({
        __bucket_priority,
        __same_city,
        __tire_vehicle_type_match,
        __season_match,
        __tire_condition_match,
        __listing_condition_match,
        __quantity_diff,
        __stud_match,
        __run_flat_match,
        __price_norm_diff,
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
