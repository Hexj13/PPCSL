import type { User } from '@/lib/api';

export type ListingViewsVisibility = 'all' | 'admin';

export function getListingViewsVisibility(): ListingViewsVisibility {
  const raw = process.env.NEXT_PUBLIC_LISTING_VIEWS_VISIBILITY?.trim().toLowerCase();
  return raw === 'admin' ? 'admin' : 'all';
}

export function shouldShowListingViews(
  user: User | null | undefined,
  isAuthInitialized: boolean,
): boolean {
  if (getListingViewsVisibility() === 'all') {
    return true;
  }
  if (!isAuthInitialized) {
    return false;
  }
  return user?.type === 'Admin';
}
