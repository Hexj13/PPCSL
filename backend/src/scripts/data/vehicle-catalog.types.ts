export type VehicleCatalogVehicleType = 'car' | 'truck' | 'moto' | 'tire';

export type VehicleCatalogModel = {
  name: string;
  order: number;
  vehicle_types: VehicleCatalogVehicleType[];
  is_archived: boolean;
};

export type VehicleCatalogBrand = {
  name: string;
  order: number;
  vehicle_types: VehicleCatalogVehicleType[];
  is_archived: boolean;
  models: VehicleCatalogModel[];
};

export type VehicleCatalog = {
  version: 1;
  source: string;
  exportedAt: string;
  brands: VehicleCatalogBrand[];
};

export const VEHICLE_CATALOG_FILENAME = 'vehicle-catalog.json';
