import { api } from '@/api/client';

export type ComparisonIdsResponse = {
  vehicleListingIds: string[];
  tireListingIds: string[];
};

export const mobileComparisonApi = {
  getIds: () => api.get<ComparisonIdsResponse>('/api/comparison/ids'),
  sync: (body: ComparisonIdsResponse) =>
    api.post<ComparisonIdsResponse>('/api/comparison/sync', body),
  add: (listingId: string) => api.post(`/api/comparison/${listingId}`),
  remove: (listingId: string) => api.delete(`/api/comparison/${listingId}`),
};
