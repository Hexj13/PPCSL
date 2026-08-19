import type { CatalogSuggestIndexDocument } from '../../catalog-suggest/catalog-suggest.types';
import type { Brand } from '../../entities/brand.entity';
import type { VehicleModel } from '../../entities/vehicle-model.entity';

export const BRANDS_CACHE = Symbol('BRANDS_CACHE');

export type BrandVehicleType = 'car' | 'truck' | 'moto' | 'tire';

export interface IBrandsCache {
  getBrands(vehicleType?: BrandVehicleType): Promise<Brand[] | null>;
  setBrands(vehicleType: BrandVehicleType | undefined, brands: Brand[]): Promise<void>;
  getModels(brandId: string, vehicleType?: BrandVehicleType): Promise<VehicleModel[] | null>;
  setModels(
    brandId: string,
    vehicleType: BrandVehicleType | undefined,
    models: VehicleModel[],
  ): Promise<void>;
  getSuggestIndex(): Promise<CatalogSuggestIndexDocument[] | null>;
  setSuggestIndex(documents: CatalogSuggestIndexDocument[]): Promise<void>;
  invalidateAll(): Promise<void>;
  invalidateModels(brandId: string): Promise<void>;
  invalidateBrandsList(): Promise<void>;
}
