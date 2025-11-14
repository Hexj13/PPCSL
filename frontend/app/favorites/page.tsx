'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';

import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ListingCard } from '@/components/ListingCard';
import { ListingCardSkeleton } from '@/components/ListingCardSkeleton';
import { SavedFiltersList } from '@/components/SavedFiltersList';
import { favoritesApi, Listing, savedFiltersApi } from '@/lib/api';
import { useAuthStore, useFavoritesStore } from '@/lib/store';

type FavoritesTab = 'listings' | 'filters';

function FavoritesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isInitialized } = useAuthStore();
  const getInitialTab = (): FavoritesTab => {
    const tabParam = searchParams.get('tab');
    return tabParam === 'filters' || tabParam === 'listings' ? tabParam : 'listings';
  };
  const [activeTab, setActiveTab] = useState<FavoritesTab>(getInitialTab());
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [filtersCount, setFiltersCount] = useState(0);
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
        setIsInitialLoading(false);
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
        setIsInitialLoading(false);
      });
  }, [user]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'filters' || tabParam === 'listings') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: FavoritesTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`/favorites?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (isInitialized && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadFavorites();
      savedFiltersApi
        .getAll()
        .then((res) => {
          setFiltersCount(Array.isArray(res.data) ? res.data.length : 0);
        })
        .catch(() => {
          setFiltersCount(0);
        });
    }
  }, [user, isInitialized, router, loadFavorites]);

  if (!isInitialized || !user) {
    return null;
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Почетна', href: '/' },
          { label: 'Омилени', href: '/favorites' },
          ...(activeTab === 'filters'
            ? [{ label: 'Филтри' }]
            : activeTab === 'listings'
              ? [{ label: 'Автомобили' }]
              : []),
        ]}
        className="mb-6"
      />
      <h1 className="text-3xl md:text-4xl font-extrabold mb-6 md:mb-8 bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
        Омилени
      </h1>

      <div className="mb-6">
        <div className="flex gap-3 border-b border-primary-500/20">
          <button
            onClick={() => handleTabChange('listings')}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'listings'
                ? 'border-primary-500 text-primary-500'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Автомобили
            {listings.length > 0 && (
              <span className="bg-bg-light border border-primary-500/20 text-gray-300 text-xs font-bold rounded-[4px] px-1.5 py-0.5 min-w-[20px] flex items-center justify-center">
                {listings.length}
              </span>
            )}
          </button>
          <button
            onClick={() => handleTabChange('filters')}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'filters'
                ? 'border-primary-500 text-primary-500'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Филтри
            {filtersCount > 0 && (
              <span className="bg-bg-light border border-primary-500/20 text-gray-300 text-xs font-bold rounded-[4px] px-1.5 py-0.5 min-w-[20px] flex items-center justify-center">
                {filtersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'listings' && (
        <>
          {isInitialLoading || loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
              {[...Array(8)].map((_, i) => (
                <ListingCardSkeleton key={i} />
              ))}
            </div>
          ) : listings.length === 0 ? (
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
        </>
      )}

      {activeTab === 'filters' && (
        <SavedFiltersList onFiltersChange={(count) => setFiltersCount(count)} />
      )}
    </div>
  );
}

export default function FavoritesPage() {
  return (
    <Suspense fallback={<div>Вчитување...</div>}>
      <FavoritesContent />
    </Suspense>
  );
}
