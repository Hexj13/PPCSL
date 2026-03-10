import { api } from './api-client';
import type { Brand, VehicleModel } from './api-types';

export const brandsApi = {
  getAll: (vehicleType?: 'car' | 'truck' | 'moto') => {
    const params = vehicleType ? { vehicleType } : {};
    return api.get<Brand[]>('/api/brands', { params });
  },
  getModels: (brandId: string, vehicleType?: 'car' | 'truck' | 'moto') => {
    const params = vehicleType ? { vehicleType } : {};
    return api.get<VehicleModel[]>(`/api/brands/${brandId}/models`, { params });
  },
  getModelsBatch: (brandIds: string[], vehicleType?: 'car' | 'truck' | 'moto') =>
    api.post<Record<string, VehicleModel[]>>('/api/brands/models/batch', {
      brandIds,
      vehicleType,
    }),
  getModelsByName: (brandName: string) =>
    api.get<VehicleModel[]>(`/api/brands/name/${brandName}/models`),
  getSearchMetadata: (params: {
    brand?: string;
    model?: string;
    vehicleType?: 'car' | 'truck' | 'moto';
  }) =>
    api.get<{
      title: string | null;
      description?: string;
      brandName?: string;
      modelNames?: string[];
    }>('/api/brands/search-metadata', { params }),
  seed: () => api.post('/api/brands/seed'),
};
