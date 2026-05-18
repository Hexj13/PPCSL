import type { MutableRefObject } from 'react';

import type { Listing } from '@/lib/api';
import { listingsApi } from '@/lib/api';
import { toast } from '@/lib/toast';

type Translate = (key: string) => string;

export async function applyListingPromotionSelection(params: {
  listing: Listing;
  days: number | null;
  setListing: (l: Listing) => void;
  listingRef: MutableRefObject<Listing | null>;
  t: Translate;
  setPromotionModalOpen: (open: boolean) => void;
}): Promise<void> {
  const { listing, days, setListing, listingRef, t, setPromotionModalOpen } = params;
  try {
    await listingsApi.togglePromotion(
      listing.id,
      true,
      days,
      days === null ? 'partner_balance' : 'default',
    );
    toast.success(t('listings.promotionEnabled'));
    const updatedListing = await listingsApi.getOne(listing.id);
    setListing(updatedListing.data);
    listingRef.current = updatedListing.data;
  } catch (error: unknown) {
    const axiosError = error as { response?: { status?: number; data?: { message?: string } } };
    const backendMessage = axiosError.response?.data?.message;
    if (axiosError.response?.status === 403) {
      toast.error(backendMessage || t('listings.promotionNotAvailable'));
    } else if (axiosError.response?.status === 400) {
      toast.error(backendMessage || t('listings.promotionOnlyActive'));
    } else {
      toast.error(backendMessage || t('listings.promotionError'));
    }
  } finally {
    setPromotionModalOpen(false);
  }
}
