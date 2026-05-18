import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { useCrossTabListingStatusRefetch } from '@/hooks/useCrossTabListingStatusRefetch';
import { analytics, buildListingViewItemParams } from '@/lib/analytics';
import type { Listing } from '@/lib/api';
import { api, listingsApi, favoritesApi } from '@/lib/api';
import { sessionStorageGetItem, sessionStorageRemoveItem } from '@/lib/browser-session-storage';
import { useAuthStore, useFavoritesStore, useComparisonStore } from '@/lib/store';
import { isTireListing } from '@/lib/utils';

interface UseListingDataProps {
  listingId: string;
  initialListing: Listing | null;
  onListingUpdate?: (next: Listing, previous: Listing | null) => void;
}

export function useListingData({
  listingId,
  initialListing,
  onListingUpdate,
}: UseListingDataProps) {
  const id = listingId;
  const { user } = useAuthStore();
  const { check } = useFavoritesStore();
  const checkVehicle = useComparisonStore((s) => s.checkVehicle);
  const checkTire = useComparisonStore((s) => s.checkTire);

  const [listing, setListing] = useState<Listing | null>(initialListing);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isInComparison, setIsInComparison] = useState(false);
  const [previousListings, setPreviousListings] = useState<Listing[]>([]);
  const [loadingPrevious, setLoadingPrevious] = useState(false);
  const [activeListingsCount, setActiveListingsCount] = useState<number>(0);

  const hasLoadedRef = useRef(false);
  const listingRef = useRef<Listing | null>(initialListing);
  const onListingUpdateRef = useRef(onListingUpdate);

  useLayoutEffect(() => {
    if (!listing) {
      return;
    }
    const applyFavoritesAndComparisonFromClientStores = () => {
      setIsFavorite(check(id));
      setIsInComparison(isTireListing(listing) ? checkTire(id) : checkVehicle(id));
    };
    if (useFavoritesStore.persist.hasHydrated() && useComparisonStore.persist.hasHydrated()) {
      applyFavoritesAndComparisonFromClientStores();
    }
    const unfav = useFavoritesStore.persist.onFinishHydration(
      applyFavoritesAndComparisonFromClientStores,
    );
    const uncomp = useComparisonStore.persist.onFinishHydration(
      applyFavoritesAndComparisonFromClientStores,
    );
    return () => {
      unfav();
      uncomp();
    };
  }, [listing, id, check, checkTire, checkVehicle]);

  useEffect(() => {
    onListingUpdateRef.current = onListingUpdate;
  }, [onListingUpdate]);

  const fetchListingData = useCallback(
    (forceRefresh = false) => {
      const currentId = id;

      const shouldRefresh = sessionStorageGetItem(`refreshListing_${currentId}`) === 'true';
      const needsRefresh = forceRefresh || shouldRefresh;

      const previousListing = listingRef.current;

      const listingPromise = needsRefresh
        ? api.get<Listing>(`/api/listings/${currentId}`, {
            params: { _t: Date.now() },
            headers: { 'X-Skip-Error-Handling': 'true' },
          })
        : listingsApi.getOne(currentId);

      const favoritePromise = user
        ? favoritesApi
            .check(currentId)
            .then((res) => res.data.isFavorite)
            .catch(() => check(currentId))
        : Promise.resolve(check(currentId));

      Promise.all([listingPromise, favoritePromise])
        .then(([listingRes, favoriteValue]) => {
          if (currentId !== id) {
            return;
          }

          if (!listingRes?.data) {
            console.error('No listing data received');
            throw new Error('No listing data received');
          }

          const hasVin = listingRes.data.vin;
          const nextListing = listingRes.data;
          listingRef.current = nextListing;
          setListing(nextListing);
          setIsFavorite(favoriteValue);
          setIsInComparison(
            isTireListing(nextListing) ? checkTire(currentId) : checkVehicle(currentId),
          );
          onListingUpdateRef.current?.(nextListing, previousListing);

          if (nextListing.user?.id) {
            listingsApi
              .getUserActiveListingsCount(nextListing.user.id)
              .then((res) => {
                if (currentId === id) {
                  setActiveListingsCount(res.data.count);
                }
              })
              .catch(() => {
                if (currentId === id) {
                  setActiveListingsCount(0);
                }
              });
          } else {
            setActiveListingsCount(0);
          }

          analytics.viewItem(currentId, buildListingViewItemParams(nextListing));

          if (hasVin && !isTireListing(nextListing)) {
            setLoadingPrevious(true);
            listingsApi
              .getHistoryByListingId(currentId)
              .then((res) => {
                if (currentId === id) {
                  setPreviousListings(res.data);
                }
              })
              .catch(() => {
                if (currentId === id) {
                  setPreviousListings([]);
                }
              })
              .finally(() => {
                if (currentId === id) {
                  setLoadingPrevious(false);
                }
              });
          } else {
            setLoadingPrevious(false);
          }

          if (needsRefresh) {
            sessionStorageRemoveItem(`refreshListing_${currentId}`);
          }
        })
        .catch((error) => {
          console.error('Error loading listing:', error);

          if (currentId !== id) {
            return;
          }

          if (needsRefresh && !forceRefresh && error?.code !== 'ECONNABORTED') {
            sessionStorageRemoveItem(`refreshListing_${currentId}`);
            setTimeout(() => {
              if (currentId === id) {
                fetchListingData(false);
              }
            }, 500);
            return;
          }

          if (needsRefresh) {
            sessionStorageRemoveItem(`refreshListing_${currentId}`);
            return;
          }

          const favoriteValue = check(currentId);
          listingRef.current = null;
          setListing(null);
          setIsFavorite(favoriteValue);
          setIsInComparison(checkVehicle(currentId) || checkTire(currentId));
        });
    },
    [id, user, check, checkVehicle, checkTire],
  );

  useEffect(() => {
    const shouldRefresh = sessionStorageGetItem(`refreshListing_${id}`) === 'true';
    hasLoadedRef.current = true;
    fetchListingData(shouldRefresh);

    return () => {
      hasLoadedRef.current = false;
    };
  }, [fetchListingData, id]);

  useCrossTabListingStatusRefetch(id, fetchListingData);

  useEffect(() => {
    const checkAndRefresh = () => {
      const shouldRefresh = sessionStorageGetItem(`refreshListing_${id}`) === 'true';
      if (shouldRefresh && hasLoadedRef.current) {
        fetchListingData(true);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAndRefresh();
      }
    };

    const handleFocus = () => {
      checkAndRefresh();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [id, fetchListingData]);

  return {
    listing,
    setListing,
    isFavorite,
    setIsFavorite,
    isInComparison,
    setIsInComparison,
    previousListings,
    loadingPrevious,
    activeListingsCount,
    listingRef,
    fetchListingData,
  };
}
