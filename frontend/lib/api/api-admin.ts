import type { ListingStatus } from '../types';

import { adminBrandsModelsApi } from './admin-brands-models';
import { adminTireBrandsModelsApi } from './admin-tire-brands-models';
import { api } from './api-client';
import type { AdminStats, Listing, PaginationMeta, PromotionHistory, User } from './api-types';

export const adminApi = {
  getAllListings: (
    page: number = 1,
    limit: number = 20,
    listingId?: string,
    userId?: string,
    status?: ListingStatus,
    isPromoted?: boolean,
    search?: string,
  ) => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('limit', limit.toString());
    if (search?.trim()) {
      params.set('search', search.trim());
    } else {
      if (listingId) {
        params.set('listingId', listingId);
      }
      if (userId) {
        params.set('userId', userId);
      }
    }
    if (status) {
      params.set('status', status);
    }
    if (isPromoted !== undefined) {
      params.set('isPromoted', isPromoted.toString());
    }
    const query = params.toString();
    return api.get<{ data: Listing[]; meta: PaginationMeta }>(`/api/admin/listings?${query}`);
  },
  getListingsStatusCounts: (search?: string) => {
    const params = new URLSearchParams();
    if (search?.trim()) {
      params.set('search', search.trim());
    }
    const query = params.toString();
    return api.get<{ Active: number; Paused: number; Closed: number; Promoted: number }>(
      `/api/admin/listings/status-counts${query ? `?${query}` : ''}`,
    );
  },
  updateListingStatus: (id: string, status: ListingStatus) =>
    api.patch(`/api/admin/listings/${id}/status`, { status }),
  getStats: () => api.get<AdminStats>('/api/admin/stats'),
  getAllUsers: (page: number = 1, limit: number = 20, search?: string, userType?: string) => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('limit', limit.toString());
    if (search) {
      params.set('search', search);
    }
    if (userType) {
      params.set('userType', userType);
    }
    const query = params.toString();
    return api.get<{ data: User[]; meta: PaginationMeta }>(`/api/admin/users?${query}`);
  },
  getUserListings: (userId: string) => api.get<Listing[]>(`/api/admin/users/${userId}/listings`),
  validateAssignUser: (userId: string) =>
    api.get<{
      valid: boolean;
      user?: {
        id: string;
        displayName: string;
        type: string;
        activeListings: number;
        listingLimit: number;
      };
      error?: string;
    }>(`/api/admin/validate-assign-user/${userId}`),
  toggleUserStatus: (userId: string) => api.patch(`/api/admin/users/${userId}/toggle-status`),
  updateUserPartnerSettings: (
    userId: string,
    data: { isPlatformPartner: boolean; freePromotionBalance?: number },
  ) => api.patch<User>(`/api/admin/users/${userId}/partner-settings`, data),
  updateUserProfile: (
    userId: string,
    data: {
      email?: string;
      firstName?: string;
      lastName?: string;
      companyName?: string;
      companyWebsiteUrl?: string;
      additionalPhone?: string;
    },
  ) => api.patch<User>(`/api/admin/users/${userId}/profile`, data),
  toggleListingPromotion: (id: string, isPromoted: boolean, days?: number | null) =>
    api.patch(`/api/admin/listings/${id}/promote`, { is_promoted: isPromoted, days }),
  getAllPromotions: (
    page: number = 1,
    limit: number = 50,
    listingId?: string,
    userId?: string,
    fromDate?: Date,
  ) => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('limit', limit.toString());
    if (listingId) params.set('listingId', listingId);
    if (userId) params.set('userId', userId);
    if (fromDate) params.set('fromDate', fromDate.toISOString());
    return api.get<{
      data: PromotionHistory[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>(`/api/admin/promotions?${params.toString()}`);
  },
  ...adminBrandsModelsApi,
  ...adminTireBrandsModelsApi,
};
