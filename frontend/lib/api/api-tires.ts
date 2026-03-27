import { api } from './api-client';

export interface TireBrand {
  id: string;
  name: string;
  logoUrl?: string | null;
  order?: number;
}

export interface TireModel {
  id: string;
  brand_id: string;
  name: string;
  order?: number;
  is_other?: boolean;
  is_archived?: boolean;
}

export const tiresApi = {
  getBrands: () => api.get<TireBrand[]>('/api/tire-brands'),
  getModelsByBrand: (brandId: string) => api.get<TireModel[]>(`/api/tire-brands/${brandId}/models`),
  getSearchMetadata: (params: { tire_brand_ids?: string; tire_model_ids?: string }) =>
    api.get<{
      title: string | null;
      description?: string;
      brandName?: string;
      modelNames?: string[];
    }>('/api/tire-brands/search-metadata', { params }),
};
