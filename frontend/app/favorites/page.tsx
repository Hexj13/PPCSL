'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';

import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { SavedFiltersList, updateSavedFiltersCache } from '@/components/search/SavedFiltersList';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useTabIndicator } from '@/hooks/useTabIndicator';
import { useTranslation } from '@/hooks/useTranslation';
import { savedFiltersApi } from '@/lib/api';
import { sessionStorageRemoveItem, sessionStorageSetItem } from '@/lib/browser-session-storage';

import { FavoritesListingsTab } from './FavoritesListingsTab';
import { useFavoritesListings } from './useFavoritesListings';

type FavoritesTab = 'listings' | 'filters';

function getInitialTab(searchParams: URLSearchParams): FavoritesTab {
  const tabParam = searchParams.get('tab');
  return tabParam === 'filters' || tabParam === 'listings' ? tabParam : 'listings';
}

function FavoritesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading, isAuthorized } = useRequireAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<FavoritesTab>(() => getInitialTab(searchParams));
  const [filtersCount, setFiltersCount] = useState(0);
  const listingsTabRef = useRef<HTMLButtonElement>(null);
  const filtersTabRef = useRef<HTMLButtonElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  const {
    listings,
    meta,
    currentPage,
    loadingMore,
    showSkeleton,
    handleLoadMore,
    handleRemoveListing,
  } = useFavoritesListings(user ?? null);

  const tabIndicatorRemeasureKey = `${activeTab}-${meta == null ? 'pending' : (meta.total ?? 0)}-${filtersCount}`;
  const { indicatorRef, indicatorStyle } = useTabIndicator(
    activeTab,
    { listings: listingsTabRef, filters: filtersTabRef },
    tabsContainerRef,
    tabIndicatorRemeasureKey,
  );

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'filters' || tabParam === 'listings') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isAuthorized || !user) return;
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
  }, [user, isAuthorized]);

  const handleTabChange = (tab: FavoritesTab) => {
    const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    sessionStorageSetItem('scrollPreserved', 'true');
    router.replace(`/favorites?${params.toString()}`, { scroll: false });
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollY, behavior: 'instant' });
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            sessionStorageRemoveItem('scrollPreserved');
          });
        });
      });
    }
  };

  if (isLoading || !isAuthorized) {
    return null;
  }

  const breadcrumbExtra =
    activeTab === 'filters'
      ? [{ label: t('favorites.filters') }]
      : activeTab === 'listings'
        ? [{ label: t('favorites.listings') }]
        : [];

  const tabButtonClass = (isActive: boolean) =>
    `shrink-0 px-4 py-3 text-base font-semibold transition-all duration-300 relative z-10 whitespace-nowrap flex items-center gap-2 ${
      isActive
        ? 'text-primary-700 bg-primary-500/10 rounded-t-lg'
        : 'text-primary-700 hover-only:hover:text-primary-900 hover-only:hover:bg-primary-500/10'
    }`;

  return (
    <div className="min-h-[calc(100vh-200px)] pb-12 md:pb-16">
      <Breadcrumbs
        items={[
          { label: t('favorites.home'), href: '/' },
          { label: t('favorites.title'), href: '/favorites' },
          ...breadcrumbExtra,
        ]}
        className="mb-6"
      />
      <h1 className="text-3xl md:text-4xl font-extrabold mb-6 md:mb-8 text-primary-900">
        {t('favorites.title')}
      </h1>

      <div className="mb-6 border-b border-primary-500/20">
        <div ref={tabsContainerRef} className="relative overflow-x-auto scrollbar-hide">
          <div className="relative flex gap-1 min-w-max">
            <button
              ref={listingsTabRef}
              type="button"
              onClick={() => handleTabChange('listings')}
              className={tabButtonClass(activeTab === 'listings')}
            >
              {t('favorites.listings')}
              {(meta?.total ?? 0) > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-primary-700/20 text-xs">
                  {meta?.total ?? 0}
                </span>
              )}
            </button>
            <button
              ref={filtersTabRef}
              type="button"
              onClick={() => handleTabChange('filters')}
              className={tabButtonClass(activeTab === 'filters')}
            >
              {t('favorites.filters')}
              {filtersCount > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-primary-700/20 text-xs">
                  {filtersCount}
                </span>
              )}
            </button>
            <div
              ref={indicatorRef}
              className="absolute bottom-0 h-0.5 bg-primary-700 transition-all duration-300 ease-in-out"
              style={{
                left: `${indicatorStyle.left}px`,
                width: `${indicatorStyle.width}px`,
              }}
            />
          </div>
        </div>
      </div>

      {activeTab === 'listings' && (
        <FavoritesListingsTab
          listings={listings}
          meta={meta}
          currentPage={currentPage}
          loadingMore={loadingMore}
          showSkeleton={showSkeleton}
          onLoadMore={handleLoadMore}
          onRemoveListing={handleRemoveListing}
        />
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
