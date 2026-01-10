import { useCallback, useEffect, useRef, useState } from 'react';

import { analytics } from '@/lib/analytics';
import { api, listingsApi, Listing, favoritesApi } from '@/lib/api';
import { useAuthStore, useFavoritesStore, useComparisonStore } from '@/lib/store';

interface UseListingDataProps {
  listingId: string;
  initialListing: Listing | null;
  onListingUpdate?: () => void;
}

export function useListingData({
  listingId,
  initialListing,
  onListingUpdate,
}: UseListingDataProps) {
  const id = listingId;
  const { user } = useAuthStore();
  const { check } = useFavoritesStore();
  const { check: checkComparison } = useComparisonStore();

  const [listing, setListing] = useState<Listing | null>(initialListing);
  const [isFavorite, setIsFavorite] = useState(() => check(id));
  const [isInComparison, setIsInComparison] = useState(false);
  const [previousListings, setPreviousListings] = useState<Listing[]>([]);
  const [loadingPrevious, setLoadingPrevious] = useState(false);
  const [activeListingsCount, setActiveListingsCount] = useState<number>(0);

  const hasLoadedRef = useRef(false);
  const hasInitialListingRef = useRef<boolean>(!!initialListing);
  const listingRef = useRef<Listing | null>(initialListing);
  const onListingUpdateRef = useRef(onListingUpdate);

  useEffect(() => {
    onListingUpdateRef.current = onListingUpdate;
  }, [onListingUpdate]);

  const fetchListingData = useCallback(
    (forceRefresh = false) => {
      const currentId = id;

      const shouldRefresh = sessionStorage.getItem(`refreshListing_${currentId}`) === 'true';
      const needsRefresh = forceRefresh || shouldRefresh;

      const preserveExisting =
        !needsRefresh && hasInitialListingRef.current && listingRef.current !== null;

      if (!preserveExisting) {
        listingRef.current = null;
        setListing(null);
        setPreviousListings([]);
        setLoadingPrevious(false);
      }

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

      const comparisonValue = checkComparison(currentId);

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
          listingRef.current = listingRes.data;
          setListing(listingRes.data);
          setIsFavorite(favoriteValue);
          setIsInComparison(comparisonValue);
          hasInitialListingRef.current = false;
          onListingUpdateRef.current?.();

          if (listingRes.data.user?.id) {
            listingsApi
              .getUserActiveListings(listingRes.data.user.id)
              .then((res) => {
                if (currentId === id) {
                  setActiveListingsCount(res.data.length);
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

          analytics.viewItem(currentId, {
            title: listingRes.data.title,
            price: listingRes.data.price,
            brand: listingRes.data.vehicle?.brand?.name,
            model: listingRes.data.vehicle?.model?.name,
          });

          if (hasVin) {
            setLoadingPrevious(true);
          }

          if (hasVin && listingRes.data.vin) {
            listingsApi
              .getByVin(listingRes.data.vin, currentId)
              .then((vinRes) => {
                if (hasLoadedRef.current && currentId === id) {
                  setPreviousListings(vinRes.data);
                }
              })
              .catch(() => {
                if (hasLoadedRef.current && currentId === id) {
                  setPreviousListings([]);
                }
              })
              .finally(() => {
                if (hasLoadedRef.current && currentId === id) {
                  setLoadingPrevious(false);
                }
              });
          }

          if (needsRefresh) {
            sessionStorage.removeItem(`refreshListing_${currentId}`);
          }
        })
        .catch((error) => {
          console.error('Error loading listing:', error);

          if (currentId !== id) {
            return;
          }

          if (needsRefresh && !forceRefresh && error?.code !== 'ECONNABORTED') {
            sessionStorage.removeItem(`refreshListing_${currentId}`);
            setTimeout(() => {
              if (currentId === id) {
                fetchListingData(false);
              }
            }, 500);
            return;
          }

          const favoriteValue = check(currentId);
          const comparisonValue = checkComparison(currentId);
          listingRef.current = null;
          setListing(null);
          setIsFavorite(favoriteValue);
          setIsInComparison(comparisonValue);

          if (needsRefresh) {
            sessionStorage.removeItem(`refreshListing_${currentId}`);
          }
        });
    },
    [id, user, check, checkComparison]
  );

  useEffect(() => {
    const shouldRefresh = sessionStorage.getItem(`refreshListing_${id}`) === 'true';
    hasLoadedRef.current = true;
    fetchListingData(shouldRefresh);

    return () => {
      hasLoadedRef.current = false;
    };
  }, [fetchListingData, id]);

  useEffect(() => {
    const checkAndRefresh = () => {
      const shouldRefresh = sessionStorage.getItem(`refreshListing_${id}`) === 'true';
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

  useEffect(() => {
    if (initialListing?.user?.id) {
      listingsApi
        .getUserActiveListings(initialListing.user.id)
        .then((res) => {
          setActiveListingsCount(res.data.length);
        })
        .catch(() => {
          setActiveListingsCount(0);
        });
    }
  }, [initialListing?.user?.id]);

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
