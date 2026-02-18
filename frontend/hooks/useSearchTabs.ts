import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

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
  'is_registered',
  'urgent',
  'is_new',
] as const;

interface UseSearchTabsParams {
  hasBasicFilters: boolean;
  hasAdvancedFiltersActive: boolean;
  hasEquipmentFiltersActive: boolean;
}

export function useSearchTabs({
  hasBasicFilters: _hasBasicFilters,
  hasAdvancedFiltersActive: _hasAdvancedFiltersActive,
  hasEquipmentFiltersActive: _hasEquipmentFiltersActive,
}: UseSearchTabsParams) {
  const searchParams = useSearchParams();

  const getInitialTab = (): SearchTab => {
    if (BASIC_PARAM_KEYS.some((key) => searchParams.get(key))) return 'basic';
    if (ADVANCED_PARAM_KEYS.some((key) => searchParams.get(key))) return 'advanced';
    if (searchParams.get('equipment')) return 'equipment';
    return 'basic';
  };

  const [activeTab, setActiveTab] = useState<SearchTab>(() => getInitialTab());

  const basicTabRef = useRef<HTMLButtonElement>(null);
  const advancedTabRef = useRef<HTMLButtonElement>(null);
  const equipmentTabRef = useRef<HTMLButtonElement>(null);
  const popularTabRef = useRef<HTMLButtonElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [showFade, setShowFade] = useState(true);
  const [fadeOpacity, setFadeOpacity] = useState(1);
  const buttonsContainerRef = useRef<HTMLDivElement>(null);

  const FADE_OUT_SCROLL_THRESHOLD = 48;

  useEffect(() => {
    const updateIndicator = () => {
      const activeRef =
        activeTab === 'basic'
          ? basicTabRef
          : activeTab === 'advanced'
            ? advancedTabRef
            : activeTab === 'equipment'
              ? equipmentTabRef
              : popularTabRef;

      if (activeRef.current && tabsContainerRef.current) {
        const rect = activeRef.current.getBoundingClientRect();
        const container = tabsContainerRef.current;
        const containerRect = container.getBoundingClientRect();
        const scrollLeft = container.scrollLeft;

        setIndicatorStyle({
          left: rect.left - containerRect.left + scrollLeft,
          width: rect.width,
        });
      }
    };

    const updateFade = () => {
      if (!tabsContainerRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = tabsContainerRef.current;
      const isAtEnd = scrollLeft >= scrollWidth - clientWidth - 1;
      setShowFade(!isAtEnd);
      const opacity = isAtEnd ? 0 : Math.max(0, 1 - scrollLeft / FADE_OUT_SCROLL_THRESHOLD);
      setFadeOpacity(opacity);
    };

    const handleResize = () => {
      updateIndicator();
      updateFade();
    };

    const handleScroll = () => {
      updateIndicator();
      updateFade();
    };

    updateIndicator();
    updateFade();

    const container = tabsContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(container);
      window.addEventListener('resize', handleResize);

      return () => {
        container.removeEventListener('scroll', handleScroll);
        resizeObserver.disconnect();
        window.removeEventListener('resize', handleResize);
      };
    }

    return undefined;
  }, [activeTab]);

  return {
    activeTab,
    setActiveTab,
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
