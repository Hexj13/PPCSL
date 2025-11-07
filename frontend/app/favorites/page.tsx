'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ListingCard } from '@/components/ListingCard';
import { ListingCardSkeleton } from '@/components/ListingCardSkeleton';
import { favoritesApi, Listing } from '@/lib/api';
import { useAuthStore, useFavoritesStore } from '@/lib/store';

export default function FavoritesPage() {
  const router = useRouter();
  const { user, isInitialized } = useAuthStore();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const showLoadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedRef = useRef(false);

  const loadFavorites = useCallback(() => {
    if (!user) return;
    if (hasLoadedRef.current) return;

    hasLoadedRef.current = true;

    showLoadingTimeoutRef.current = setTimeout(() => {
      setLoading(true);
    }, 200);

    favoritesApi
      .getAll()
      .then((res) => {
        if (showLoadingTimeoutRef.current) {
          clearTimeout(showLoadingTimeoutRef.current);
          showLoadingTimeoutRef.current = null;
        }

        const favoritesList = Array.isArray(res.data)
          ? res.data.map((f: { listing: Listing }) => f.listing).filter(Boolean)
          : [];
        setListings(favoritesList);
        setLoading(false);
        const { setFavorites } = useFavoritesStore.getState();
        const favoriteIds = favoritesList.map((listing: Listing) => listing.id);
        setFavorites(favoriteIds);
      })
      .catch(() => {
        if (showLoadingTimeoutRef.current) {
          clearTimeout(showLoadingTimeoutRef.current);
          showLoadingTimeoutRef.current = null;
        }
        setListings([]);
        setLoading(false);
      });
  }, [user]);

  useEffect(() => {
    if (!isInitialized && !user) {
      return;
    }

    if (isInitialized && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadFavorites();
    }
  }, [user, isInitialized, router, loadFavorites]);

  if (!isInitialized && !user) {
    return null;
  }

  if (isInitialized && !user) {
    return null;
  }

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl md:text-4xl font-extrabold mb-6 md:mb-8 bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
          Омилени
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
          {[...Array(8)].map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl md:text-4xl font-extrabold mb-6 md:mb-8 bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
        Омилени
      </h1>

      {listings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-300 text-lg">Во омилени сè уште нема ништо</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              forceFavorite={true}
              onRemove={() => {
                setListings((prev) => prev.filter((l) => l.id !== listing.id));
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
