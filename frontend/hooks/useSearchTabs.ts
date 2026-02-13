import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

type SearchTab = 'basic' | 'advanced' | 'equipment' | 'popular';

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
    const hasBasicParams =
      searchParams.get('brand') ||
      searchParams.get('model') ||
      searchParams.get('year_gte') ||
      searchParams.get('year_lte') ||
      searchParams.get('price_gte') ||
      searchParams.get('price_lte') ||
      searchParams.get('fuels') ||
      searchParams.get('body_types') ||
      searchParams.get('transmissions') ||
      searchParams.get('drive_types') ||
      searchParams.get('mileage_gte') ||
      searchParams.get('mileage_lte');

    if (hasBasicParams) {
      return 'basic';
    }

    const hasAdvancedParams =
      searchParams.get('cities') ||
      searchParams.get('currency') ||
      searchParams.get('engine_displ_l_gte') ||
      searchParams.get('engine_displ_l_lte') ||
      searchParams.get('horsepower_gte') ||
      searchParams.get('horsepower_lte') ||
      searchParams.get('colors') ||
      searchParams.get('doors') ||
      searchParams.get('conditions') ||
      searchParams.get('registration_types') ||
      searchParams.get('is_registered') ||
      searchParams.get('urgent') ||
      searchParams.get('is_new');

    if (hasAdvancedParams) {
      return 'advanced';
    }

    const hasEquipmentParams = searchParams.get('equipment');
    if (hasEquipmentParams) {
      return 'equipment';
    }

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
  const buttonsContainerRef = useRef<HTMLDivElement>(null);
  const [showFadeButtons, setShowFadeButtons] = useState(true);

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

    const checkScrollability = () => {
      if (!tabsContainerRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = tabsContainerRef.current;
      const isAtEnd = scrollLeft >= scrollWidth - clientWidth - 1;
      setShowFade(!isAtEnd);
    };

    const handleResize = () => {
      updateIndicator();
      checkScrollability();
    };

    const handleScroll = () => {
      updateIndicator();
      checkScrollability();
    };

    updateIndicator();
    checkScrollability();

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

  useEffect(() => {
    const checkButtonsScrollability = () => {
      if (!buttonsContainerRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = buttonsContainerRef.current;
      const threshold = 2;
      const isAtEnd = scrollLeft + clientWidth >= scrollWidth - threshold;
      setShowFadeButtons(!isAtEnd && scrollWidth > clientWidth);
    };

    checkButtonsScrollability();
    const container = buttonsContainerRef.current;
    if (container) {
      const handleScroll = () => {
        checkButtonsScrollability();
      };

      const resizeObserver = new ResizeObserver(() => {
        checkButtonsScrollability();
      });

      container.addEventListener('scroll', handleScroll, { passive: true });
      resizeObserver.observe(container);
      window.addEventListener('resize', checkButtonsScrollability);

      return () => {
        container.removeEventListener('scroll', handleScroll);
        resizeObserver.disconnect();
        window.removeEventListener('resize', checkButtonsScrollability);
      };
    }

    return undefined;
  }, []);

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
    buttonsContainerRef,
    showFadeButtons,
  };
}
