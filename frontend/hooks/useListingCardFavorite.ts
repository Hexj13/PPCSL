import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
  type MouseEvent,
  type MutableRefObject,
} from 'react';

import { useTranslation } from '@/hooks/useTranslation';
import { analytics, buildListingViewItemParams } from '@/lib/analytics';
import type { Listing } from '@/lib/api';
import { favoritesApi } from '@/lib/api';
import { CARD_EXIT_ANIMATION_MS } from '@/lib/constants';
import { publishCrossTabEvent } from '@/lib/cross-tab-events';
import { useAuthStore, useFavoritesStore } from '@/lib/store';
import { toast } from '@/lib/toast';
import { isTireListing } from '@/lib/utils';

type PendingRemoveChain = {
  raf1?: number;
  raf2?: number;
  timeout?: ReturnType<typeof setTimeout>;
};

function clearPendingRemoveChain(ref: MutableRefObject<PendingRemoveChain>) {
  const p = ref.current;
  if (p.raf1 !== undefined) cancelAnimationFrame(p.raf1);
  if (p.raf2 !== undefined) cancelAnimationFrame(p.raf2);
  if (p.timeout !== undefined) clearTimeout(p.timeout);
  ref.current = {};
}

function scheduleRemoveAfterExitAnimation(
  ref: MutableRefObject<PendingRemoveChain>,
  onRemove: () => void,
) {
  clearPendingRemoveChain(ref);
  const raf1 = requestAnimationFrame(() => {
    const raf2 = requestAnimationFrame(() => {
      ref.current.timeout = setTimeout(() => {
        ref.current = {};
        onRemove();
      }, CARD_EXIT_ANIMATION_MS);
    });
    ref.current.raf2 = raf2;
  });
  ref.current.raf1 = raf1;
}

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
  const pendingRemoveChainRef = useRef<PendingRemoveChain>({});
  const { t } = useTranslation();

  useEffect(() => {
    return () => clearPendingRemoveChain(pendingRemoveChainRef);
  }, []);

  useEffect(() => {
    setLocalIsFavorite(storeIsFavorite);
  }, [storeIsFavorite]);

  const isOwnListing = useMemo(
    () => !!(user && listing.user && user.id === listing.user.id),
    [user, listing.user],
  );

  const handleRemove = useCallback(() => {
    removeFavorite(listing.id);
    clearPendingRemoveChain(pendingRemoveChainRef);
    if (onRemove) {
      scheduleRemoveAfterExitAnimation(pendingRemoveChainRef, onRemove);
    }
    favoritesApi
      .remove(listing.id)
      .then(() => {
        publishCrossTabEvent({
          type: 'favorites-changed',
          listingId: listing.id,
          action: 'remove',
          isAuthenticated: true,
          at: Date.now(),
        });
        analytics.removeFromWishlist(listing.id, {
          listing_category: isTireListing(listing) ? 'tire' : 'vehicle',
        });
        toast.success(t('listings.removeFromFavorites'));
      })
      .catch(() => {
        clearPendingRemoveChain(pendingRemoveChainRef);
        setLocalIsFavorite(true);
        addFavorite(listing.id);
        toast.error(t('listings.removeFromFavoritesError'));
      })
      .finally(() => {
        setIsToggling(false);
        isTogglingRef.current = false;
      });
  }, [listing, removeFavorite, addFavorite, onRemove, t]);

  const handleAdd = useCallback(() => {
    addFavorite(listing.id);
    favoritesApi
      .add(listing.id)
      .then(() => {
        publishCrossTabEvent({
          type: 'favorites-changed',
          listingId: listing.id,
          action: 'add',
          isAuthenticated: true,
          at: Date.now(),
        });
        analytics.addToWishlist(listing.id, buildListingViewItemParams(listing));
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
  }, [listing, addFavorite, removeFavorite, t]);

  const handleToggleFavorite = useCallback(
    (e: MouseEvent) => {
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
    isRemovingFromFavorites: Boolean(onRemove) && forceFavorite && !localIsFavorite,
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
