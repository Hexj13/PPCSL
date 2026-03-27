import type { TireBrand } from '../../entities/tire-brand.entity';
import type { TireModel } from '../../entities/tire-model.entity';

export const TIRES_CACHE = Symbol('TIRES_CACHE');

export interface ITiresCache {
  getBrands(): Promise<TireBrand[] | null>;
  setBrands(brands: TireBrand[]): Promise<void>;
  getModels(brandId: string): Promise<TireModel[] | null>;
  setModels(brandId: string, models: TireModel[]): Promise<void>;
  invalidateAll(): Promise<void>;
  invalidateModels(brandId: string): Promise<void>;
}
