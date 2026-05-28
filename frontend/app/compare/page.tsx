'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';

import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { RESET_SEARCH_EVENT } from '@/components/layout/Header/HeaderLogo';
import { LoadMoreButton } from '@/components/listing/LoadMoreButton';
import { useI18n } from '@/components/providers/I18nProvider';
import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import { useTabIndicator } from '@/hooks/useTabIndicator';
import { useTranslation } from '@/hooks/useTranslation';
import type { Listing } from '@/lib/api';
import { sessionStorageRemoveItem, sessionStorageSetItem } from '@/lib/browser-session-storage';
import { loadComparisonFromApi } from '@/lib/comparisonMigration';
import { subscribeToCrossTabEvents } from '@/lib/cross-tab-events';
import type { Locale } from '@/lib/i18n-types';
import { loadSiteConfigSync } from '@/lib/site-config';
import { useAuthStore, useComparisonStore } from '@/lib/store';
import { localePrefixPath } from '@/lib/url-locale';
import { getCountry } from '@/lib/utils';
import { Button, TrashIcon } from '@/ui';

import type { ComparisonField } from './comparisonFields';
import {
  getComparisonFieldsForListings,
  getVehicleEquipmentComparisonFieldsForListings,
  hasVehicleEquipmentToCompare,
} from './comparisonFields';
import { getTireComparisonFieldsForListings } from './tireComparisonFields';
import { useComparePageListings } from './useComparePageListings';

type CompareTab = 'vehicles' | 'tires';

function getInitialTab(searchParams: URLSearchParams): CompareTab {
  const tabParam = searchParams.get('tab');
  return tabParam === 'tires' || tabParam === 'vehicles' ? tabParam : 'vehicles';
}

const BALANCE_ICON_PATH =
  'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3';

const EYE_ICON_PATH =
  'M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178zM15 12a3 3 0 11-6 0 3 3 0 016 0z';

const EYE_SLASH_ICON_PATH =
  'M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88';

function CompareOptionsToggleIcon({ optionsVisible }: { optionsVisible: boolean }) {
  return (
    <svg
      className="w-5 h-5 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d={optionsVisible ? EYE_SLASH_ICON_PATH : EYE_ICON_PATH}
      />
    </svg>
  );
}

function CompareEmptyBlock({
  heading,
  hint,
  onBrowse,
  browseLabel,
  dataTestId,
}: {
  heading: string;
  hint: string;
  onBrowse: () => void;
  browseLabel: string;
  dataTestId: string;
}) {
  return (
    <div className="surface text-center py-12" data-testid={dataTestId}>
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

const COMPARE_ROW_BORDER_CLASS = 'border-b border-primary-700/20';

const COMPARE_LABEL_COL_CLASS = 'max-md:w-[38%] max-md:max-w-[9.5rem]';
const COMPARE_SINGLE_LISTING_COL_CLASS = 'max-md:w-[62%]';
const COMPARE_MULTI_LISTING_COL_CLASS = 'max-md:w-[11.5rem]';

function getMobileTableMinWidthClass(listingCount: number): string {
  if (listingCount <= 1) return 'max-md:min-w-0';
  if (listingCount === 2) return 'max-md:min-w-[calc(9.5rem+23rem)]';
  return 'max-md:min-w-[calc(9.5rem+34.5rem)]';
}

function CompareTableBlock({
  listings,
  fields,
  onRemove,
  parameterLabel,
  siteConfig,
  t,
  locale,
  tableTestId = 'compare-table',
  showRemoveActions = true,
}: {
  listings: Listing[];
  fields: ComparisonField[];
  onRemove?: (id: string) => void;
  parameterLabel: string;
  siteConfig: { currency: string };
  t: (key: string, params?: Record<string, string | number>) => string;
  locale: Locale;
  tableTestId?: string;
  showRemoveActions?: boolean;
}) {
  const listingColClass =
    listings.length === 1 ? COMPARE_SINGLE_LISTING_COL_CLASS : COMPARE_MULTI_LISTING_COL_CLASS;
  const labelCellClass =
    'text-left py-2 px-2 max-md:px-1.5 max-md:break-words max-md:align-top md:py-4 md:px-4 text-sm md:text-base';

  return (
    <div className="surface overflow-x-auto">
      <table
        className={`w-full max-md:table-fixed ${getMobileTableMinWidthClass(listings.length)} md:min-w-[800px]`}
        data-testid={tableTestId}
      >
        <colgroup className="md:hidden">
          <col className={COMPARE_LABEL_COL_CLASS} />
          {listings.map((listing) => (
            <col key={listing.id} className={listingColClass} />
          ))}
        </colgroup>
        <thead>
          <tr className={COMPARE_ROW_BORDER_CLASS}>
            <th
              className={`${labelCellClass} text-primary-900 font-semibold ${COMPARE_LABEL_COL_CLASS}`}
            >
              {parameterLabel}
            </th>
            {listings.map((listing) => (
              <th
                key={listing.id}
                className={`text-center py-2 px-2 max-md:px-1.5 md:py-4 md:px-4 text-sm md:text-base text-primary-900 font-semibold max-md:min-w-0 md:min-w-[200px] ${listingColClass}`}
              >
                {showRemoveActions && onRemove ? (
                  <div className="flex justify-center items-center">
                    <button
                      type="button"
                      onClick={() => onRemove(listing.id)}
                      className="p-2 text-text-secondary hover-only:hover:text-red-400 transition-colors"
                      title={t('common.removeFromComparison')}
                      data-testid={`compare-remove-${listing.id}`}
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
                ) : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => (
            <tr key={field.key} className={`${COMPARE_ROW_BORDER_CLASS} last:border-b-0`}>
              <td
                className={`${labelCellClass} text-primary-700 font-semibold ${COMPARE_LABEL_COL_CLASS}`}
              >
                {t(field.labelKey)}
              </td>
              {listings.map((listing) => field.renderCell(listing, t, siteConfig, locale))}
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
  const { replace } = useLocalizedNavigation();
  const { t } = useTranslation();
  const { locale } = useI18n();
  const user = useAuthStore((s) => s.user);
  const vehicleComparisons = useComparisonStore((s) => s.vehicleComparisons);
  const tireComparisons = useComparisonStore((s) => s.tireComparisons);
  const rehydrate = useComparisonStore((s) => s.rehydrate);

  const [activeTab, setActiveTab] = useState<CompareTab>(() => getInitialTab(searchParams));
  const [showVehicleOptionsComparison, setShowVehicleOptionsComparison] = useState(false);
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

  useEffect(() => {
    const unsub = subscribeToCrossTabEvents((ev) => {
      if (ev.type !== 'comparison-changed') return;
      if (user) {
        void loadComparisonFromApi();
      } else {
        void useComparisonStore.persist.rehydrate?.();
      }
    });
    return unsub;
  }, [user]);

  const siteConfig = loadSiteConfigSync(getCountry());

  const vehicleEquipmentFields = useMemo(
    () => getVehicleEquipmentComparisonFieldsForListings(vehicleListings, t),
    [vehicleListings, t],
  );
  const canCompareVehicleEquipment = useMemo(
    () => hasVehicleEquipmentToCompare(vehicleListings),
    [vehicleListings],
  );
  const vehicleListingIdsSignature = useMemo(
    () => vehicleListings.map((listing) => listing.id).join('\u0001'),
    [vehicleListings],
  );

  useEffect(() => {
    setShowVehicleOptionsComparison(false);
  }, [vehicleListingIdsSignature]);

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
    sessionStorageSetItem('scrollPreserved', 'true');
    router.replace(localePrefixPath(`/compare?${params.toString()}`, locale), { scroll: false });
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
            data-testid="compare-tab-vehicles"
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
            data-testid="compare-tab-tires"
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
      <div
        className="max-w-7xl mx-auto min-h-[calc(100vh-200px)] pb-12 md:pb-16"
        data-testid="compare-page"
      >
        <Breadcrumbs
          items={[
            { label: t('breadcrumbs.home'), href: localePrefixPath('/', locale) },
            { label: breadcrumbLabel, href: localePrefixPath('/compare', locale) },
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
    <div
      className="max-w-7xl mx-auto min-h-[calc(100vh-200px)] pb-12 md:pb-16"
      data-testid="compare-page"
    >
      <Breadcrumbs
        items={[
          { label: t('breadcrumbs.home'), href: localePrefixPath('/', locale) },
          { label: breadcrumbLabel, href: localePrefixPath('/compare', locale) },
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
              window.dispatchEvent(new CustomEvent(RESET_SEARCH_EVENT));
              replace('/', { scroll: false });
            }}
            browseLabel={t('compare.browseListings')}
            dataTestId="compare-empty-vehicles"
          />
        ) : (
          <>
            {vehicleListings.length >= 2 && (
              <div className="flex justify-end mb-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="group inline-flex items-center gap-2 !text-primary-700 !border-primary-700 transition-colors hover-only:hover:!text-primary-900 hover-only:hover:!border-primary-900"
                  onClick={() => void handleClearAllVehicles()}
                  data-testid="compare-clear-all-vehicles"
                >
                  <TrashIcon className="w-4 h-4 shrink-0 transition-colors group-hover:text-primary-900" />
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
              locale={locale}
            />
            {canCompareVehicleEquipment && (
              <div className="flex justify-center mt-6" data-testid="compare-toggle-options">
                <LoadMoreButton
                  variant="inline"
                  onClick={() => setShowVehicleOptionsComparison((prev) => !prev)}
                >
                  <CompareOptionsToggleIcon optionsVisible={showVehicleOptionsComparison} />
                  {showVehicleOptionsComparison
                    ? t('compare.hideOptionsComparison')
                    : t('compare.compareOptions')}
                </LoadMoreButton>
              </div>
            )}
            {canCompareVehicleEquipment && (
              <div
                className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
                  showVehicleOptionsComparison
                    ? 'grid-rows-[1fr] opacity-100'
                    : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                }`}
                aria-hidden={!showVehicleOptionsComparison}
              >
                <div className="overflow-hidden min-h-0">
                  <div className="mt-6" data-testid="compare-options-section">
                    <CompareTableBlock
                      listings={vehicleListings}
                      fields={vehicleEquipmentFields}
                      parameterLabel={t('compare.parameter')}
                      siteConfig={siteConfig}
                      t={t}
                      locale={locale}
                      tableTestId="compare-options-table"
                      showRemoveActions={false}
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        ))}

      {activeTab === 'tires' &&
        (tireListings.length === 0 ? (
          <CompareEmptyBlock
            heading={t('compare.noTires')}
            hint={t('compare.addTiresHint')}
            onBrowse={() => {
              if (typeof window !== 'undefined') {
                window.location.href = localePrefixPath('/listings?category=tire', locale);
              }
            }}
            browseLabel={t('compare.browseTireListings')}
            dataTestId="compare-empty-tires"
          />
        ) : (
          <>
            {tireListings.length >= 2 && (
              <div className="flex justify-end mb-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="group inline-flex items-center gap-2 !text-primary-700 !border-primary-700 transition-colors hover-only:hover:!text-primary-900 hover-only:hover:!border-primary-900"
                  onClick={() => void handleClearAllTires()}
                  data-testid="compare-clear-all-tires"
                >
                  <TrashIcon className="w-4 h-4 shrink-0 transition-colors group-hover:text-primary-900" />
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
              locale={locale}
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
