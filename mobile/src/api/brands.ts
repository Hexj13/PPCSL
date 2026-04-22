import type { Brand, VehicleModel } from '@/synced/api-types';

import { api } from '@/api/client';

export const mobileBrandsApi = {
  getAll: (vehicleType?: 'car' | 'truck' | 'moto') => {
    const params = vehicleType ? { vehicleType } : {};
    return api.get<Brand[]>('/api/brands', { params });
  },
  getModels: (brandId: string, vehicleType?: 'car' | 'truck' | 'moto') => {
    const params = vehicleType ? { vehicleType } : {};
    return api.get<VehicleModel[]>(`/api/brands/${brandId}/models`, { params });
  },
};
