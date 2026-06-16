import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useTabIndicator } from '@/hooks/useTabIndicator';
import { createCoalescedCallback } from '@/lib/resize-coalesced';

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
  const [showFade, setShowFade] = useState(true);
  const [fadeOpacity, setFadeOpacity] = useState(1);
  const buttonsContainerRef = useRef<HTMLDivElement>(null);

  const FADE_OUT_SCROLL_THRESHOLD = 48;

  const lastFadeRef = useRef({ show: true, opacity: 1 });
  const rafIdRef = useRef(0);

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
    `${mode}-${activeTab}`,
  );

  const scrollTabsToStart = useCallback(() => {
    tabsContainerRef.current?.scrollTo({ left: 0, behavior: 'instant' });
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
    const targetScrollLeft = Math.min(el.offsetLeft, container.scrollWidth - container.clientWidth);
    container.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const updateFade = () => {
      if (!tabsContainerRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = tabsContainerRef.current;
      const isAtEnd = scrollLeft >= scrollWidth - clientWidth - 1;
      const show = !isAtEnd;
      const opacity = isAtEnd ? 0 : Math.max(0, 1 - scrollLeft / FADE_OUT_SCROLL_THRESHOLD);
      if (lastFadeRef.current.show !== show || lastFadeRef.current.opacity !== opacity) {
        lastFadeRef.current = { show, opacity };
        setShowFade(show);
        setFadeOpacity(opacity);
      }
    };

    const runUpdates = () => {
      updateFade();
      rafIdRef.current = 0;
    };

    const handleResize = createCoalescedCallback(updateFade);

    const handleScroll = () => {
      if (rafIdRef.current === 0) {
        rafIdRef.current = requestAnimationFrame(runUpdates);
      }
    };

    updateFade();

    const container = tabsContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(container);
      window.addEventListener('resize', handleResize);

      return () => {
        container.removeEventListener('scroll', handleScroll);
        resizeObserver.disconnect();
        window.removeEventListener('resize', handleResize);
        if (rafIdRef.current !== 0) cancelAnimationFrame(rafIdRef.current);
      };
    }

    return undefined;
  }, [activeTab, mode]);

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
    showFade,
    fadeOpacity,
    buttonsContainerRef,
  };
}
