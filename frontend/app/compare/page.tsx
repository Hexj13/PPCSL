'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';

import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { LoadMoreButton } from '@/components/listing/LoadMoreButton';
import { useTabIndicator } from '@/hooks/useTabIndicator';
import { useTranslation } from '@/hooks/useTranslation';
import type { Listing } from '@/lib/api';
import { loadSiteConfigSync } from '@/lib/site-config';
import { useComparisonStore } from '@/lib/store';
import { getCountry } from '@/lib/utils';
import { Button, TrashIcon } from '@/ui';

import type { ComparisonField } from './comparisonFields';
import { getComparisonFieldsForListings } from './comparisonFields';
import { getTireComparisonFieldsForListings } from './tireComparisonFields';
import { useComparePageListings } from './useComparePageListings';

type CompareTab = 'vehicles' | 'tires';

function getInitialTab(searchParams: URLSearchParams): CompareTab {
  const tabParam = searchParams.get('tab');
  return tabParam === 'tires' || tabParam === 'vehicles' ? tabParam : 'vehicles';
}

const BALANCE_ICON_PATH =
  'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3';

function CompareEmptyBlock({
  heading,
  hint,
  onBrowse,
  browseLabel,
}: {
  heading: string;
  hint: string;
  onBrowse: () => void;
  browseLabel: string;
}) {
  return (
    <div className="surface text-center py-12">
      <svg
        className="w-24 h-24 mx-auto text-text-secondary mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={BALANCE_ICON_PATH} />
      </svg>
      <h2 className="text-2xl font-bold text-primary-900 mb-2">{heading}</h2>
      <p className="mb-6" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
        {hint}
      </p>
      <div className="flex justify-center">
        <LoadMoreButton onClick={onBrowse} variant="inline">
          {browseLabel}
        </LoadMoreButton>
      </div>
    </div>
  );
}

function CompareTableBlock({
  listings,
  fields,
  onRemove,
  parameterLabel,
  siteConfig,
  t,
}: {
  listings: Listing[];
  fields: ComparisonField[];
  onRemove: (id: string) => void;
  parameterLabel: string;
  siteConfig: { currency: string };
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  return (
    <div className="surface overflow-x-auto">
      <table className="w-full min-w-[800px]">
        <thead>
          <tr className="border-b border-primary-700/30">
            <th className="text-left py-2 px-2 md:py-4 md:px-4 text-sm md:text-base text-primary-900 font-semibold">
              {parameterLabel}
            </th>
            {listings.map((listing) => (
              <th
                key={listing.id}
                className="text-center py-2 px-2 md:py-4 md:px-4 text-sm md:text-base text-primary-900 font-semibold min-w-[200px]"
              >
                <div className="flex justify-center items-center">
                  <button
                    type="button"
                    onClick={() => onRemove(listing.id)}
                    className="p-2 text-text-secondary hover-only:hover:text-red-400 transition-colors"
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
          {fields.map((field) => (
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
  );
}

function ComparePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const vehicleComparisons = useComparisonStore((s) => s.vehicleComparisons);
  const tireComparisons = useComparisonStore((s) => s.tireComparisons);
  const rehydrate = useComparisonStore((s) => s.rehydrate);

  const [activeTab, setActiveTab] = useState<CompareTab>(() => getInitialTab(searchParams));
  const [comparisonStoreHydrated, setComparisonStoreHydrated] = useState(false);
  const vehiclesTabRef = useRef<HTMLButtonElement>(null);
  const tiresTabRef = useRef<HTMLButtonElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = useComparisonStore.persist.onFinishHydration(() => {
      setComparisonStoreHydrated(true);
    });
    if (useComparisonStore.persist.hasHydrated()) {
      setComparisonStoreHydrated(true);
    }
    return unsub;
  }, []);

  const {
    vehicleListings,
    tireListings,
    hasInitialized,
    handleRemoveVehicle,
    handleRemoveTire,
    handleClearAllVehicles,
    handleClearAllTires,
  } = useComparePageListings(
    vehicleComparisons,
    tireComparisons,
    comparisonStoreHydrated,
    rehydrate,
  );

  const vehicleCount = vehicleComparisons.length;
  const tireCount = tireComparisons.length;
  const tabIndicatorRemeasureKey = `${activeTab}-${vehicleCount}-${tireCount}-${hasInitialized}`;
  const { indicatorRef, indicatorStyle } = useTabIndicator(
    activeTab,
    { vehicles: vehiclesTabRef, tires: tiresTabRef },
    tabsContainerRef,
    tabIndicatorRemeasureKey,
  );

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'tires' || tabParam === 'vehicles') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const siteConfig = loadSiteConfigSync(getCountry());

  const tabButtonClass = (isActive: boolean) =>
    `shrink-0 px-4 py-3 text-base font-semibold transition-all duration-300 relative z-10 whitespace-nowrap flex items-center gap-2 ${
      isActive
        ? 'text-primary-700 bg-primary-500/10 rounded-t-lg'
        : 'text-primary-700 hover-only:hover:text-primary-900 hover-only:hover:bg-primary-500/10'
    }`;

  const handleTabChange = (tab: CompareTab) => {
    const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('scrollPreserved', 'true');
    }
    router.replace(`/compare?${params.toString()}`, { scroll: false });
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

  const breadcrumbLabel = t('compare.pageTitle');
  const breadcrumbExtra =
    activeTab === 'tires'
      ? [{ label: t('compare.tiresSectionTitle') }]
      : [{ label: t('compare.vehiclesSectionTitle') }];

  const tabsRow = (
    <div className="mb-6 border-b border-primary-500/20">
      <div ref={tabsContainerRef} className="relative overflow-x-auto scrollbar-hide">
        <div className="relative flex gap-1 min-w-max">
          <button
            ref={vehiclesTabRef}
            type="button"
            onClick={() => handleTabChange('vehicles')}
            className={tabButtonClass(activeTab === 'vehicles')}
          >
            {t('compare.vehiclesSectionTitle')}
            {vehicleCount > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-primary-700/20 text-xs">
                {vehicleCount}
              </span>
            )}
          </button>
          <button
            ref={tiresTabRef}
            type="button"
            onClick={() => handleTabChange('tires')}
            className={tabButtonClass(activeTab === 'tires')}
          >
            {t('compare.tiresSectionTitle')}
            {tireCount > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-primary-700/20 text-xs">
                {tireCount}
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
  );

  if (!comparisonStoreHydrated || !hasInitialized) {
    return (
      <div className="max-w-7xl mx-auto min-h-[calc(100vh-200px)] pb-12 md:pb-16">
        <Breadcrumbs
          items={[
            { label: t('breadcrumbs.home'), href: '/' },
            { label: breadcrumbLabel, href: '/compare' },
            ...(comparisonStoreHydrated ? breadcrumbExtra : []),
          ]}
          className="mb-6"
        />
        <h1 className="text-xl md:text-3xl lg:text-4xl font-extrabold mb-6 md:mb-8 text-primary-900">
          {breadcrumbLabel}
        </h1>
        {comparisonStoreHydrated ? tabsRow : null}
        <div className="surface py-12 animate-pulse">
          <div className="w-24 h-24 mx-auto rounded-full bg-primary-500/10 mb-4" />
          <div className="h-8 w-64 mx-auto bg-primary-500/10 rounded-sm mb-2" />
          <div className="h-4 w-80 mx-auto bg-primary-500/10 rounded-sm" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto min-h-[calc(100vh-200px)] pb-12 md:pb-16">
      <Breadcrumbs
        items={[
          { label: t('breadcrumbs.home'), href: '/' },
          { label: breadcrumbLabel, href: '/compare' },
          ...breadcrumbExtra,
        ]}
        className="mb-6"
      />
      <h1 className="text-xl md:text-3xl lg:text-4xl font-extrabold mb-6 md:mb-8 text-primary-900">
        {breadcrumbLabel}
      </h1>

      {tabsRow}

      {activeTab === 'vehicles' &&
        (vehicleListings.length === 0 ? (
          <CompareEmptyBlock
            heading={t('compare.noVehicles')}
            hint={t('compare.addVehiclesHint')}
            onBrowse={() => {
              if (typeof window !== 'undefined') {
                window.location.href = '/';
              }
            }}
            browseLabel={t('compare.browseListings')}
          />
        ) : (
          <>
            {vehicleListings.length >= 2 && (
              <div className="flex justify-end mb-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="inline-flex items-center gap-2"
                  onClick={() => void handleClearAllVehicles()}
                >
                  <TrashIcon className="w-4 h-4 shrink-0" />
                  {t('compare.clearAll')}
                </Button>
              </div>
            )}
            <CompareTableBlock
              listings={vehicleListings}
              fields={getComparisonFieldsForListings(vehicleListings)}
              onRemove={handleRemoveVehicle}
              parameterLabel={t('compare.parameter')}
              siteConfig={siteConfig}
              t={t}
            />
          </>
        ))}

      {activeTab === 'tires' &&
        (tireListings.length === 0 ? (
          <CompareEmptyBlock
            heading={t('compare.noTires')}
            hint={t('compare.addTiresHint')}
            onBrowse={() => {
              if (typeof window !== 'undefined') {
                window.location.href = '/listings?category=tire';
              }
            }}
            browseLabel={t('compare.browseTireListings')}
          />
        ) : (
          <>
            {tireListings.length >= 2 && (
              <div className="flex justify-end mb-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="inline-flex items-center gap-2"
                  onClick={() => void handleClearAllTires()}
                >
                  <TrashIcon className="w-4 h-4 shrink-0" />
                  {t('compare.clearAll')}
                </Button>
              </div>
            )}
            <CompareTableBlock
              listings={tireListings}
              fields={getTireComparisonFieldsForListings(tireListings)}
              onRemove={handleRemoveTire}
              parameterLabel={t('compare.parameter')}
              siteConfig={siteConfig}
              t={t}
            />
          </>
        ))}
    </div>
  );
}

export default function ComparePage() {
  const { t } = useTranslation();

  return (
    <Suspense fallback={<div>{t('common.loading')}</div>}>
      <ComparePageContent />
    </Suspense>
  );
}
