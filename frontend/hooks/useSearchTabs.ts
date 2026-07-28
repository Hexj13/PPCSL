import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useI18n } from '@/components/providers/I18nProvider';
import { getTabCenteredBetweenControlsScrollLeft } from '@/components/search/search-filters/SearchTabs';
import { useTabIndicator } from '@/hooks/useTabIndicator';

type SearchTab = 'basic' | 'advanced' | 'equipment' | 'popular';

const BASIC_PARAM_KEYS = [
  'brand',
  'model',
  'year_gte',
  'year_lte',
  'price_gte',
  'price_lte',
  'fuels',
  'body_types',
  'transmissions',
  'drive_types',
  'mileage_gte',
  'mileage_lte',
] as const;

const ADVANCED_PARAM_KEYS = [
  'cities',
  'currency',
  'engine_displ_l_gte',
  'engine_displ_l_lte',
  'horsepower_gte',
  'horsepower_lte',
  'colors',
  'doors',
  'conditions',
  'registration_types',
  'urgent',
  'is_new',
  'available_in_credit',
  'down_payment_amount_gte',
  'seller_types',
  'seller_type',
] as const;

interface UseSearchTabsParams {
  mode?: 'vehicle' | 'tire';
  hasBasicFilters: boolean;
  hasAdvancedFiltersActive: boolean;
  hasEquipmentFiltersActive: boolean;
  isInternalSearchRef?: React.MutableRefObject<boolean>;
  preserveTabOnNextSyncRef?: React.MutableRefObject<boolean>;
}

const TIRE_BASIC_PARAM_KEYS = [
  'tire_brand_ids',
  'tire_model_ids',
  'tire_widths',
  'tire_profiles',
  'tire_diameters',
  'tireVehicleType',
  'tire_seasons',
  'tire_conditions',
  'tire_quantities',
  'tire_studded',
  'tire_run_flat',
  'tire_reinforced_xl',
  'tire_spare_donut',
  'tire_tubeless',
  'tire_acoustic',
  'price_gte',
  'price_lte',
  'cities',
  'seller_types',
  'seller_type',
] as const;

const TIRE_POPULAR_HINT_KEYS: readonly string[] = [];

export function useSearchTabs({
  mode = 'vehicle',
  hasBasicFilters: _hasBasicFilters,
  hasAdvancedFiltersActive: _hasAdvancedFiltersActive,
  hasEquipmentFiltersActive: _hasEquipmentFiltersActive,
  isInternalSearchRef,
  preserveTabOnNextSyncRef,
}: UseSearchTabsParams) {
  const searchParams = useSearchParams();
  const { locale } = useI18n();

  const getInitialTab = useCallback((): SearchTab => {
    if (mode === 'tire') {
      const hasBasicHint = TIRE_BASIC_PARAM_KEYS.some((key) => {
        if (key === 'tire_seasons' || key === 'tire_quantities') return false;
        return !!searchParams.get(key);
      });
      if (hasBasicHint) return 'basic';
      if (TIRE_POPULAR_HINT_KEYS.some((key) => searchParams.get(key))) return 'popular';
      return 'basic';
    }
    if (BASIC_PARAM_KEYS.some((key) => searchParams.get(key))) return 'basic';
    if (searchParams.get('equipment')) return 'equipment';
    if (ADVANCED_PARAM_KEYS.some((key) => searchParams.get(key))) return 'advanced';
    return 'basic';
  }, [searchParams, mode]);

  const [activeTab, setActiveTab] = useState<SearchTab>(() => getInitialTab());
  const prevSearchParamsStringRef = useRef(searchParams.toString());

  useEffect(() => {
    if (mode === 'tire' && (activeTab === 'advanced' || activeTab === 'equipment')) {
      setActiveTab('basic');
    }
  }, [mode, activeTab]);

  useEffect(() => {
    const paramsString = searchParams.toString();
    if (preserveTabOnNextSyncRef?.current) {
      preserveTabOnNextSyncRef.current = false;
      prevSearchParamsStringRef.current = paramsString;
      return;
    }
    if (isInternalSearchRef?.current) {
      prevSearchParamsStringRef.current = paramsString;
      return;
    }
    if (paramsString === prevSearchParamsStringRef.current) {
      return;
    }
    prevSearchParamsStringRef.current = paramsString;
    setActiveTab(getInitialTab());
  }, [searchParams, isInternalSearchRef, preserveTabOnNextSyncRef, getInitialTab]);

  const basicTabRef = useRef<HTMLButtonElement>(null);
  const advancedTabRef = useRef<HTMLButtonElement>(null);
  const equipmentTabRef = useRef<HTMLButtonElement>(null);
  const popularTabRef = useRef<HTMLButtonElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const buttonsContainerRef = useRef<HTMLDivElement>(null);

  const tabRefs = useMemo(
    () => ({
      basic: basicTabRef,
      advanced: advancedTabRef,
      equipment: equipmentTabRef,
      popular: popularTabRef,
    }),
    [],
  );

  const { indicatorRef, indicatorStyle } = useTabIndicator(
    activeTab,
    tabRefs,
    tabsContainerRef,
    `${mode}-${activeTab}-${locale}`,
  );

  const scrollTabsToStart = useCallback(() => {
    const container = tabsContainerRef.current;
    const basicTab = basicTabRef.current;
    if (!container || !basicTab || container.scrollWidth <= container.clientWidth) return;

    container.scrollTo({
      left: getTabCenteredBetweenControlsScrollLeft(container, basicTab),
      behavior: 'instant',
    });
  }, []);

  const scrollTabToStart = useCallback((tab: SearchTab) => {
    const container = tabsContainerRef.current;
    if (!container || container.scrollWidth <= container.clientWidth) return;
    const tabRef =
      tab === 'basic'
        ? basicTabRef
        : tab === 'advanced'
          ? advancedTabRef
          : tab === 'equipment'
            ? equipmentTabRef
            : popularTabRef;
    const el = tabRef.current;
    if (!el) return;

    const isMobileTabsViewport =
      typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
    const maxScrollLeft = container.scrollWidth - container.clientWidth;
    const targetScrollLeft = isMobileTabsViewport
      ? getTabCenteredBetweenControlsScrollLeft(container, el)
      : Math.min(el.offsetLeft, maxScrollLeft);

    container.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
  }, []);

  return {
    activeTab,
    setActiveTab,
    scrollTabToStart,
    scrollTabsToStart,
    basicTabRef,
    advancedTabRef,
    equipmentTabRef,
    popularTabRef,
    indicatorRef,
    indicatorStyle,
    tabsContainerRef,
    buttonsContainerRef,
  };
}
