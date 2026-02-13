'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';

import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { LoadMoreButton } from '@/components/listing/LoadMoreButton';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { listingsApi, Listing } from '@/lib/api';
import { loadSiteConfigSync } from '@/lib/site-config';
import { useComparisonStore } from '@/lib/store';
import { getCountry } from '@/lib/utils';

import { getComparisonFieldsForListings } from './comparisonFields';

export default function ComparePage() {
  const { t } = useTranslation();
  const { isLoading, isAuthorized } = useRequireAuth();
  const { comparisons, remove, rehydrate } = useComparisonStore();
  const [listings, setListings] = useState<Listing[]>([]);
  const [hasInitialized, setHasInitialized] = useState(false);
  const prevComparisonsRef = useRef<string[]>([]);
  const listingsLengthRef = useRef(0);
  const hasRehydratedRef = useRef(false);
  const skeletonStartRef = useRef<number | null>(null);

  const siteConfig = loadSiteConfigSync(getCountry());

  const finishWithMinSkeleton = useCallback(() => {
    const start = skeletonStartRef.current ?? Date.now();
    const elapsed = Date.now() - start;
    const remaining = Math.max(0, 1000 - elapsed);
    setTimeout(() => setHasInitialized(true), remaining);
  }, []);

  useEffect(() => {
    skeletonStartRef.current = Date.now();
    const rehydrateAndFetch = async () => {
      if (!hasRehydratedRef.current) {
        hasRehydratedRef.current = true;
        await rehydrate();
      }

      let currentComparisons = comparisons;

      if (currentComparisons.length === 0 && typeof window !== 'undefined') {
        const backup = localStorage.getItem('comparison-storage-backup');
        if (backup) {
          try {
            const parsed = JSON.parse(backup);
            if (parsed.state?.comparisons?.length > 0) {
              currentComparisons = parsed.state.comparisons;
              await rehydrate();
            }
          } catch {
            // Ignore errors
          }
        }
      }

      if (currentComparisons.length === 0) {
        setListings([]);
        prevComparisonsRef.current = [];
        listingsLengthRef.current = 0;
        finishWithMinSkeleton();
        return;
      }

      const prevIds = new Set(prevComparisonsRef.current);
      const currentIds = new Set(currentComparisons);
      const newIds = currentComparisons.filter((id) => !prevIds.has(id));

      if (newIds.length === 0 && listingsLengthRef.current > 0) {
        setListings((prev) => {
          const filtered = prev.filter((listing) => currentIds.has(listing.id));
          listingsLengthRef.current = filtered.length;
          return filtered;
        });
        prevComparisonsRef.current = currentComparisons;
        finishWithMinSkeleton();
        return;
      }

      try {
        const idsToFetch = newIds.length > 0 ? newIds : currentComparisons;
        const promises = idsToFetch.map((id) => listingsApi.getOne(id).catch(() => null));
        const results = await Promise.all(promises);
        const validListings = results.filter((r) => r !== null).map((r) => r!.data);

        if (newIds.length > 0) {
          setListings((prev) => {
            const existingIds = new Set(prev.map((l) => l.id));
            const newListings = validListings.filter((l) => !existingIds.has(l.id));
            const updated = [...prev.filter((l) => currentIds.has(l.id)), ...newListings];
            listingsLengthRef.current = updated.length;
            return updated;
          });
        } else {
          setListings(validListings);
          listingsLengthRef.current = validListings.length;
        }
        prevComparisonsRef.current = currentComparisons;
      } catch (error) {
        console.error('Error fetching listings:', error);
        toast.error(t('compare.loadError'));
      } finally {
        finishWithMinSkeleton();
      }
    };

    rehydrateAndFetch();
  }, [comparisons, rehydrate, t, finishWithMinSkeleton]);

  if (isLoading || !isAuthorized) {
    return null;
  }

  const handleRemove = (id: string) => {
    setListings((prev) => prev.filter((listing) => listing.id !== id));
    remove(id);
    toast.success(t('compare.removedFromComparison'));
  };

  if (!hasInitialized) {
    return (
      <div className="max-w-7xl mx-auto min-h-[calc(100vh-200px)]">
        <Breadcrumbs
          items={[{ label: t('breadcrumbs.home'), href: '/' }, { label: t('compare.title') }]}
          className="mb-6"
        />
        <h1 className="text-xl md:text-3xl lg:text-4xl font-extrabold mb-6 text-primary-900">
          {t('compare.title')}
        </h1>
        <div className="surface py-12 animate-pulse">
          <div className="w-24 h-24 mx-auto rounded-full bg-primary-500/10 mb-4" />
          <div className="h-8 w-64 mx-auto bg-primary-500/10 rounded mb-2" />
          <div className="h-4 w-80 mx-auto bg-primary-500/10 rounded" />
        </div>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="max-w-7xl mx-auto min-h-[calc(100vh-200px)]">
        <Breadcrumbs
          items={[{ label: t('breadcrumbs.home'), href: '/' }, { label: t('compare.title') }]}
          className="mb-6"
        />
        <h1 className="text-xl md:text-3xl lg:text-4xl font-extrabold mb-6 text-primary-900">
          {t('compare.title')}
        </h1>
        <div className="surface text-center py-12">
          <svg
            className="w-24 h-24 mx-auto text-text-secondary mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
            />
          </svg>
          <h2 className="text-2xl font-bold text-primary-900 mb-2">{t('compare.noVehicles')}</h2>
          <p className="mb-6" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
            {t('compare.addVehiclesHint')}
          </p>
          <div className="flex justify-center">
            <LoadMoreButton
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.href = '/';
                }
              }}
              variant="inline"
            >
              {t('compare.browseListings')}
            </LoadMoreButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto min-h-[calc(100vh-200px)]">
      <Breadcrumbs
        items={[{ label: t('breadcrumbs.home'), href: '/' }, { label: t('compare.title') }]}
        className="mb-6"
      />
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-xl md:text-3xl lg:text-4xl font-extrabold text-primary-900">
          {t('compare.title')}
        </h1>
        <button
          onClick={() => {
            comparisons.forEach((id) => remove(id));
            if (typeof window !== 'undefined') {
              localStorage.removeItem('comparison-storage-backup');
            }
            toast.success(t('compare.allRemoved'));
          }}
          className="px-8 py-2 md:py-2.5 text-sm md:text-sm lg:text-base rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 text-primary-700 hover:text-primary-900 hover:border-primary-900 active:text-primary-900 active:border-primary-900 border-2 border-primary-700 bg-primary-500/10 select-none"
        >
          {t('compare.clearAll')}
        </button>
      </div>

      <div className="surface overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-primary-700/30">
              <th className="text-left py-2 px-2 md:py-4 md:px-4 text-sm md:text-base text-primary-900 font-semibold">
                {t('compare.parameter')}
              </th>
              {listings.map((listing) => (
                <th
                  key={listing.id}
                  className="text-center py-2 px-2 md:py-4 md:px-4 text-sm md:text-base text-primary-900 font-semibold min-w-[200px]"
                >
                  <div className="flex justify-center items-center">
                    <button
                      onClick={() => handleRemove(listing.id)}
                      className="p-2 text-text-secondary hover:text-red-400 transition-colors"
                      title={t('common.removeFromComparison')}
                    >
                      <svg
                        className="w-5 h-5 md:w-6 md:h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {getComparisonFieldsForListings(listings).map((field) => (
              <tr key={field.key} className="border-b border-primary-700/10 last:border-b-0">
                <td className="py-2 px-2 md:py-4 md:px-4 text-sm md:text-base text-primary-700 font-semibold">
                  {t(field.labelKey)}
                </td>
                {listings.map((listing) => field.renderCell(listing, t, siteConfig))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
