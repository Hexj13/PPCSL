import { api } from '@/api/client';

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

export const mobileTiresApi = {
  getBrands: () => api.get<TireBrand[]>('/api/tire-brands'),
  getModelsByBrand: (brandId: string) => api.get<TireModel[]>(`/api/tire-brands/${brandId}/models`),
};
