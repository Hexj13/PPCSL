import type { Listing, PaginationMeta } from './api';

export interface NormalizedListingResponse {
  data: Listing[];
  meta: PaginationMeta;
}

export type ListingApiResponse =
  | Listing[]
  | { data: Listing[]; meta?: PaginationMeta }
  | NormalizedListingResponse;

export function normalizeListingResponse(
  responseData: ListingApiResponse,
  page: number = 1,
  limit: number = 20,
): NormalizedListingResponse {
  if (Array.isArray(responseData)) {
    const total = responseData.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const data = responseData.slice(startIndex, endIndex);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  if (responseData && typeof responseData === 'object' && 'data' in responseData) {
    const data = Array.isArray(responseData.data) ? responseData.data : [];
    const meta = responseData.meta || {
      total: data.length,
      page: page,
      limit: limit,
      totalPages: Math.ceil(data.length / limit),
    };

    if (data.length > limit) {
      return {
        data: data.slice(0, limit),
        meta,
      };
    }

    return {
      data,
      meta,
    };
  }

  return {
    data: [],
    meta: {
      total: 0,
      page: page,
      limit: limit,
      totalPages: 0,
    },
  };
}
