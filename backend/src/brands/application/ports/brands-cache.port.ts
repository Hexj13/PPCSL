import { Brand } from '../../entities/brand.entity';
import { VehicleModel } from '../../entities/vehicle-model.entity';

export const BRANDS_CACHE = Symbol('BRANDS_CACHE');

export type BrandVehicleType = 'car' | 'truck' | 'moto';

export interface IBrandsCache {
  getBrands(vehicleType?: BrandVehicleType): Promise<Brand[] | null>;
  setBrands(vehicleType: BrandVehicleType | undefined, brands: Brand[]): Promise<void>;
  getModels(brandId: string, vehicleType?: BrandVehicleType): Promise<VehicleModel[] | null>;
  setModels(
    brandId: string,
    vehicleType: BrandVehicleType | undefined,
    models: VehicleModel[],
  ): Promise<void>;
  invalidateAll(): Promise<void>;
  invalidateModels(brandId: string): Promise<void>;
  invalidateBrandsList(): Promise<void>;
}
