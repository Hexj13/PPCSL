import type { AdminBrand, AdminModel } from './admin-brands-models';
import { api } from './api-client';

export interface CreateTireBrandPayload {
  name: string;
}

export interface UpdateTireBrandPayload {
  name?: string;
}

export interface CreateTireModelPayload {
  brandId: string;
  name: string;
  isOther?: boolean;
}

export interface UpdateTireModelPayload {
  brandId?: string;
  name?: string;
  isOther?: boolean;
}

export const adminTireBrandsModelsApi = {
  getTireBrandsModels: (
    page: number = 1,
    limit: number = 100,
    query?: string,
    tireVehicleType?: 'car' | 'truck' | 'moto',
  ) => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('limit', limit.toString());
    if (query?.trim()) {
      params.set('query', query.trim());
    }
    if (tireVehicleType) {
      params.set('tireVehicleType', tireVehicleType);
    }
    return api.get<{
      data: AdminBrand[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>(`/api/admin/tire-brands-models?${params.toString()}`);
  },

  createTireBrand: (payload: CreateTireBrandPayload) =>
    api.post<AdminBrand>('/api/admin/tire-brands', payload),

  updateTireBrand: (id: string, payload: UpdateTireBrandPayload) =>
    api.patch<AdminBrand>(`/api/admin/tire-brands/${id}`, payload),

  createTireModel: (payload: CreateTireModelPayload) =>
    api.post<AdminModel>('/api/admin/tire-models', payload),

  updateTireModel: (id: string, payload: UpdateTireModelPayload) =>
    api.patch<AdminModel>(`/api/admin/tire-models/${id}`, payload),

  archiveTireBrand: (id: string) => api.patch(`/api/admin/tire-brands/${id}/archive`),

  archiveTireModel: (id: string) => api.patch(`/api/admin/tire-models/${id}/archive`),

  unarchiveTireBrand: (id: string) => api.patch(`/api/admin/tire-brands/${id}/unarchive`),

  unarchiveTireModel: (id: string) => api.patch(`/api/admin/tire-models/${id}/unarchive`),
};
