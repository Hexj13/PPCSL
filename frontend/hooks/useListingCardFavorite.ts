import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from 'react';

import { useTranslation } from '@/hooks/useTranslation';
import { analytics } from '@/lib/analytics';
import type { Listing } from '@/lib/api';
import { favoritesApi } from '@/lib/api';
import { useAuthStore, useFavoritesStore } from '@/lib/store';
import { toast } from '@/lib/toast';

export function useListingCardFavorite(
  listing: Listing,
  displayTitle: string,
  forceFavorite: boolean,
  onRemove: (() => void) | undefined,
) {
  const { user } = useAuthStore();
  const { favorites, add: addFavorite, remove: removeFavorite } = useFavoritesStore();
  const storeIsFavorite = useMemo(
    () => forceFavorite || (favorites && favorites.includes(listing.id)),
    [forceFavorite, listing.id, favorites],
  );
  const [localIsFavorite, setLocalIsFavorite] = useState(storeIsFavorite);
  const [isToggling, setIsToggling] = useState(false);
  const isTogglingRef = useRef(false);
  const { t } = useTranslation();

  useEffect(() => {
    setLocalIsFavorite(storeIsFavorite);
  }, [storeIsFavorite]);

  const isOwnListing = useMemo(
    () => !!(user && listing.user && user.id === listing.user.id),
    [user, listing.user],
  );

  const handleRemove = useCallback(() => {
    removeFavorite(listing.id);
    onRemove?.();
    favoritesApi
      .remove(listing.id)
      .then(() => {
        analytics.removeFromWishlist(listing.id);
        toast.success(t('listings.removeFromFavorites'));
      })
      .catch(() => {
        setLocalIsFavorite(true);
        addFavorite(listing.id);
        toast.error(t('listings.removeFromFavoritesError'));
      })
      .finally(() => {
        setIsToggling(false);
        isTogglingRef.current = false;
      });
  }, [listing.id, removeFavorite, addFavorite, onRemove, t]);

  const handleAdd = useCallback(() => {
    addFavorite(listing.id);
    favoritesApi
      .add(listing.id)
      .then(() => {
        analytics.addToWishlist(listing.id, { title: displayTitle, price: listing.price });
        toast.success(t('listings.addToFavorites'));
      })
      .catch(() => {
        setLocalIsFavorite(false);
        removeFavorite(listing.id);
        toast.error(t('listings.addToFavoritesError'));
      })
      .finally(() => {
        setIsToggling(false);
        isTogglingRef.current = false;
      });
  }, [listing.id, listing.price, displayTitle, addFavorite, removeFavorite, t]);

  const handleToggleFavorite = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!user) {
        toast.warning(t('common.loginRequired'));
        return;
      }
      if (isTogglingRef.current) return;

      if (localIsFavorite) {
        setIsToggling(true);
        isTogglingRef.current = true;
        setLocalIsFavorite(false);
        startTransition(() => {
          handleRemove();
        });
        return;
      }

      if (isOwnListing) {
        toast.warning(t('listingDetail.cannotFavoriteOwnListingToast'));
        return;
      }

      setIsToggling(true);
      isTogglingRef.current = true;
      setLocalIsFavorite(true);
      startTransition(() => {
        handleAdd();
      });
    },
    [user, localIsFavorite, isOwnListing, t, handleRemove, handleAdd],
  );

  return {
    isFavorite: localIsFavorite,
    isToggling,
    isOwnListing,
    handleToggleFavorite,
  };
}

export function getFavoriteButtonClassName(isToggling: boolean, isFavorite: boolean): string {
  if (isToggling) {
    return 'opacity-40 cursor-wait lg:opacity-0 lg:group-hover:opacity-40';
  }
  if (isFavorite) {
    return 'opacity-100 hover-only:hover:border-primary-400';
  }
  return 'opacity-60 lg:opacity-0 lg:group-hover:opacity-60 hover-only:hover:opacity-100 hover-only:hover:border-primary-400';
}
