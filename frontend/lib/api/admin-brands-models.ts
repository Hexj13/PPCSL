import { api } from './api-client';

export interface AdminBrand {
  id: string;
  name: string;
  vehicleTypes: ('car' | 'truck' | 'moto')[];
  isArchived: boolean;
  activeListingsCount: number;
  models: AdminModel[];
}

export interface AdminModel {
  id: string;
  brandId: string;
  name: string;
  vehicleTypes: ('car' | 'truck' | 'moto')[];
  isArchived: boolean;
  activeListingsCount: number;
}

export interface CreateBrandPayload {
  name: string;
  vehicleTypes: ('car' | 'truck' | 'moto')[];
}

export interface UpdateBrandPayload {
  name?: string;
  vehicleTypes?: ('car' | 'truck' | 'moto')[];
}

export interface CreateModelPayload {
  brandId: string;
  name: string;
  vehicleTypes: ('car' | 'truck' | 'moto')[];
}

export interface UpdateModelPayload {
  brandId?: string;
  name?: string;
  vehicleTypes?: ('car' | 'truck' | 'moto')[];
}

export const adminBrandsModelsApi = {
  getBrandsModels: (
    page: number = 1,
    limit: number = 100,
    query?: string,
    vehicleType?: 'car' | 'truck' | 'moto',
  ) => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('limit', limit.toString());
    if (query?.trim()) {
      params.set('query', query.trim());
    }
    if (vehicleType) {
      params.set('vehicleType', vehicleType);
    }
    return api.get<{
      data: AdminBrand[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>(`/api/admin/brands-models?${params.toString()}`);
  },
  createBrand: (payload: CreateBrandPayload) => api.post<AdminBrand>('/api/admin/brands', payload),
  updateBrand: (id: string, payload: UpdateBrandPayload) =>
    api.patch<AdminBrand>(`/api/admin/brands/${id}`, payload),
  createModel: (payload: CreateModelPayload) => api.post<AdminModel>('/api/admin/models', payload),
  updateModel: (id: string, payload: UpdateModelPayload) =>
    api.patch<AdminModel>(`/api/admin/models/${id}`, payload),
  archiveBrand: (id: string) => api.patch(`/api/admin/brands/${id}/archive`),
  archiveModel: (id: string) => api.patch(`/api/admin/models/${id}/archive`),
  unarchiveBrand: (id: string) => api.patch(`/api/admin/brands/${id}/unarchive`),
  unarchiveModel: (id: string) => api.patch(`/api/admin/models/${id}/unarchive`),
};
