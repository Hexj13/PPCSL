'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';

import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { ListingCard } from '@/components/listing/ListingCard';
import { ListingCardSkeleton } from '@/components/listing/ListingCardSkeleton';
import { SavedFiltersList, updateSavedFiltersCache } from '@/components/search/SavedFiltersList';
import { useLoadingState } from '@/hooks/useLoadingState';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { favoritesApi, Listing, savedFiltersApi } from '@/lib/api';
import { useFavoritesStore } from '@/lib/store';

type FavoritesTab = 'listings' | 'filters';

function FavoritesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading, isAuthorized } = useRequireAuth();
  const { t } = useTranslation();
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

        const sortedList = [...favoritesList].sort((a, b) => {
          if (a.is_promoted && !b.is_promoted) return -1;
          if (!a.is_promoted && b.is_promoted) return 1;
          const dateA = new Date(a.updated_at).getTime();
          const dateB = new Date(b.updated_at).getTime();
          return dateB - dateA;
        });

        setListings(sortedList);
        setLoading(false);
        setIsInitialLoading(false);
        const { setFavorites } = useFavoritesStore.getState();
        const favoriteIds = favoritesList.map((listing: Listing) => listing.id);
        setFavorites(favoriteIds);

        if ('serviceWorker' in navigator && 'caches' in window) {
          caches.open('kupito-data-v1').then((cache) => {
            favoriteIds.forEach((id) => {
              cache.add(`/listings/${id}`).catch(() => {});
            });
          });
        }
      })
      .catch(() => {
        if (showLoadingTimeoutRef.current) {
          clearTimeout(showLoadingTimeoutRef.current);
          showLoadingTimeoutRef.current = null;
        }

        const { favorites: favoriteIds } = useFavoritesStore.getState();
        if (favoriteIds.length > 0 && 'caches' in window) {
          caches.open('kupito-data-v1').then((cache) => {
            favoriteIds.forEach((id) => {
              cache.add(`/listings/${id}`).catch(() => {});
            });
          });
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
    const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('scrollPreserved', 'true');
    }
    router.replace(`/favorites?${params.toString()}`, { scroll: false });
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollY, behavior: 'instant' });
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            sessionStorage.removeItem('scrollPreserved');
          });
        });
      });
    }
  };

  const isLoadingContent = isInitialLoading || loading;
  const { visible: showSkeleton } = useLoadingState({
    isLoading: isLoadingContent,
    immediate: true,
    showDelay: 0,
    minDisplayTime: 1000,
  });

  useEffect(() => {
    if (!isAuthorized || !user) {
      return;
    }

    loadFavorites();
    savedFiltersApi
      .getAll()
      .then((res) => {
        const filtersList = Array.isArray(res.data) ? res.data : [];
        setFiltersCount(filtersList.length);
        updateSavedFiltersCache(filtersList);
      })
      .catch(() => {
        setFiltersCount(0);
        updateSavedFiltersCache([]);
      });
  }, [user, isAuthorized, loadFavorites]);

  if (isLoading || !isAuthorized) {
    return null;
  }

  return (
    <div className="min-h-[calc(100vh-200px)] pb-12 md:pb-16">
      <Breadcrumbs
        items={[
          { label: t('favorites.home'), href: '/' },
          { label: t('favorites.title'), href: '/favorites' },
          ...(activeTab === 'filters'
            ? [{ label: t('favorites.filters') }]
            : activeTab === 'listings'
              ? [{ label: t('favorites.listings') }]
              : []),
        ]}
        className="mb-6"
      />
      <h1 className="text-3xl md:text-4xl font-extrabold mb-6 md:mb-8 text-primary-700">
        {t('favorites.title')}
      </h1>

      <div className="mb-6">
        <div className="flex gap-3 border-b border-primary-500/20">
          <button
            onClick={() => handleTabChange('listings')}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'listings'
                ? 'border-primary-500 text-primary-500'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {t('favorites.listings')}
            {listings.length > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-primary-500/20 text-xs">
                {listings.length}
              </span>
            )}
          </button>
          <button
            onClick={() => handleTabChange('filters')}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'filters'
                ? 'border-primary-500 text-primary-500'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {t('favorites.filters')}
            {filtersCount > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-primary-500/20 text-xs">
                {filtersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'listings' && (
        <>
          {showSkeleton && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
              {[...Array(4)].map((_, i) => (
                <ListingCardSkeleton key={i} />
              ))}
            </div>
          )}

          {!showSkeleton && (
            <>
              {listings.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-text-primary text-lg">{t('favorites.empty')}</p>
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
        </>
      )}

      {activeTab === 'filters' && (
        <SavedFiltersList onFiltersChange={(count) => setFiltersCount(count)} />
      )}
    </div>
  );
}

export default function FavoritesPage() {
  const { t } = useTranslation();

  return (
    <Suspense fallback={<div>{t('common.loading')}</div>}>
      <FavoritesContent />
    </Suspense>
  );
}
