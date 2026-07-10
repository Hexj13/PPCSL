import { BodyType } from '../../common/constants';

export const POPULAR_BODY_TYPES_CAR = [
  BodyType.Hatchback,
  BodyType.Wagon,
  BodyType.SUV,
  BodyType.Minivan,
  BodyType.Sedan,
  BodyType.Convertible,
] as const;

export type PopularBodyTypeCar = (typeof POPULAR_BODY_TYPES_CAR)[number];

export type PopularModelItem = {
  brandId: string;
  brandName: string;
  modelId: string;
  modelName: string;
  listingCount: number;
};

export type PopularStatItem = {
  key: string;
  label: string;
  count: number;
};

export type PopularStatBucket = {
  items: PopularStatItem[];
  otherCount: number;
  total: number;
};

export type PopularListingsData = {
  generatedAt: string;
  modelsByBodyType: Record<PopularBodyTypeCar, PopularModelItem[]>;
  brandListingCounts: Record<string, number>;
  bodyTypeListingCounts: Record<PopularBodyTypeCar, number>;
  statistics: {
    brands: PopularStatBucket;
    bodyTypes: PopularStatBucket;
    fuels: PopularStatBucket;
  };
};
