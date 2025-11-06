'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { ListingCard } from '@/components/ListingCard';
import { favoritesApi, Listing } from '@/lib/api';
import { useAuthStore, useFavoritesStore } from '@/lib/store';

export default function FavoritesPage() {
  const router = useRouter();
  const { user, isInitialized } = useAuthStore();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = useCallback(() => {
    if (!user) return;

    favoritesApi
      .getAll()
      .then((res) => {
        const favoritesList = res.data.map((f: { listing: Listing }) => f.listing);
        setListings(favoritesList);
        const { setFavorites } = useFavoritesStore.getState();
        const favoriteIds = favoritesList.map((listing: Listing) => listing.id);
        setFavorites(favoriteIds);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!isInitialized) return;

    if (!user) {
      router.push('/login');
      return;
    }

    loadFavorites();
  }, [user, isInitialized, router, loadFavorites]);

  if (!isInitialized) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="mt-4 text-gray-300">Вчитување...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="mt-4 text-gray-300">Вчитување...</p>
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
