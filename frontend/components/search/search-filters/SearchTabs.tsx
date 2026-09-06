'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useTranslation } from '@/hooks/useTranslation';
import { analytics } from '@/lib/analytics';
import { ChevronRightIcon, StarIcon } from '@/ui';

interface SearchTabsProps {
  variant?: 'vehicle' | 'tire';
  activeTab: 'basic' | 'advanced' | 'equipment' | 'popular';
  onTabChange: (_tab: 'basic' | 'advanced' | 'equipment' | 'popular') => void;
  hasBasicFilters: boolean;
  hasAdvancedFiltersActive: boolean;
  hasEquipmentFiltersActive: boolean;
  hasPopularFiltersActive: boolean;
  basicTabRef: React.RefObject<HTMLButtonElement | null>;
  advancedTabRef: React.RefObject<HTMLButtonElement | null>;
  equipmentTabRef: React.RefObject<HTMLButtonElement | null>;
  popularTabRef: React.RefObject<HTMLButtonElement | null>;
  indicatorRef: React.RefObject<HTMLDivElement | null>;
  indicatorStyle: { left: number; width: number };
  tabsContainerRef: React.RefObject<HTMLDivElement | null>;
  switchingLocked?: boolean;
  layoutKey: string;
}

const tabButtonClass =
  'inline-flex h-12 items-center px-4 text-sm font-semibold transition-[background-color,border-radius,color] duration-300 relative z-10 shrink-0 whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-60';

const SCROLL_EPSILON = 1;
const SCROLL_EDGE_PADDING = 8;
const SCROLL_LEFT_CONTROL_WIDTH = 56;

function getLeftScrollInset(targetScrollLeft: number) {
  return targetScrollLeft > SCROLL_EPSILON
    ? SCROLL_LEFT_CONTROL_WIDTH + SCROLL_EDGE_PADDING
    : SCROLL_EDGE_PADDING;
}

function getScrollState(container: HTMLElement) {
  const { scrollLeft, scrollWidth, clientWidth } = container;
  const maxScrollLeft = scrollWidth - clientWidth;

  return {
    canScrollLeft: scrollLeft > SCROLL_EPSILON,
    canScrollRight: maxScrollLeft - scrollLeft > SCROLL_EPSILON,
    maxScrollLeft,
  };
}

function getTabCenteredBetweenControlsScrollLeft(container: HTMLElement, tab: HTMLElement) {
  const { clientWidth, scrollWidth } = container;
  const centerBetweenControls =
    SCROLL_LEFT_CONTROL_WIDTH + (clientWidth - SCROLL_LEFT_CONTROL_WIDTH * 2) / 2;
  const rawScrollLeft = tab.offsetLeft + tab.offsetWidth / 2 - centerBetweenControls;

  return Math.max(0, Math.min(rawScrollLeft, scrollWidth - clientWidth));
}

export { getTabCenteredBetweenControlsScrollLeft };

function scrollToNextTab(container: HTMLElement, tabs: HTMLElement[]) {
  const { scrollLeft, clientWidth } = container;
  const visibleRight = scrollLeft + clientWidth;

  for (const tab of tabs) {
    if (tab.offsetLeft + tab.offsetWidth > visibleRight + SCROLL_EPSILON) {
      const rawTargetScrollLeft = tab.offsetLeft - SCROLL_EDGE_PADDING;
      const targetScrollLeft = Math.min(
        tab.offsetLeft - getLeftScrollInset(rawTargetScrollLeft),
        container.scrollWidth - clientWidth,
      );
      container.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
      return;
    }
  }

  container.scrollTo({
    left: container.scrollWidth - clientWidth,
    behavior: 'smooth',
  });
}

function scrollToPreviousTab(container: HTMLElement, tabs: HTMLElement[]) {
  const { scrollLeft, clientWidth } = container;

  for (let index = 0; index < tabs.length; index += 1) {
    const tab = tabs[index];
    if (
      tab.offsetLeft >= scrollLeft - SCROLL_EPSILON &&
      tab.offsetLeft < scrollLeft + clientWidth
    ) {
      const previousIndex = Math.max(0, index - 1);
      const rawTargetScrollLeft = tabs[previousIndex].offsetLeft - SCROLL_EDGE_PADDING;
      const targetScrollLeft = Math.max(
        tabs[previousIndex].offsetLeft - getLeftScrollInset(rawTargetScrollLeft),
        0,
      );
      container.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
      return;
    }
  }

  container.scrollTo({ left: 0, behavior: 'smooth' });
}

function PopularTabLabel({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5" suppressHydrationWarning>
      <StarIcon className="w-4 h-4 shrink-0" aria-hidden />
      <span suppressHydrationWarning>{label}</span>
    </span>
  );
}

function TabScrollEdge({
  direction,
  ariaLabel,
  onClick,
}: {
  direction: 'left' | 'right';
  ariaLabel: string;
  onClick: () => void;
}) {
  const isLeft = direction === 'left';

  return (
    <div
      className={`pointer-events-none absolute inset-y-0 z-20 w-14 lg:hidden ${
        isLeft ? 'left-0' : 'right-0'
      }`}
    >
      <div className={`flex h-full items-center ${isLeft ? 'justify-start' : 'justify-end'}`}>
        <button
          type="button"
          aria-label={ariaLabel}
          onClick={onClick}
          className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary-700 bg-bg-card text-primary-700 hover-only:hover:border-primary-900 hover-only:hover:text-primary-900 active:border-primary-900 active:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-card"
        >
          <ChevronRightIcon className={`h-3.5 w-3.5 ${isLeft ? 'rotate-180' : ''}`} aria-hidden />
        </button>
      </div>
    </div>
  );
}

function useTabScrollAffordance(
  tabsContainerRef: React.RefObject<HTMLDivElement | null>,
  tabRefs: React.RefObject<HTMLButtonElement | null>[],
  basicTabRef: React.RefObject<HTMLButtonElement | null>,
  activeTab: SearchTabsProps['activeTab'],
  syncKey: string,
) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const appliedBasicCenterSyncKeyRef = useRef<string | null>(null);
  const scrollStateRef = useRef({ canScrollLeft: false, canScrollRight: false });

  const applyBasicTabCenteredScroll = useCallback(() => {
    if (activeTab !== 'basic') return;
    if (appliedBasicCenterSyncKeyRef.current === syncKey) return;

    const container = tabsContainerRef.current;
    const basicTab = basicTabRef.current;
    if (
      !container ||
      !basicTab ||
      !basicTab.offsetWidth ||
      container.scrollWidth <= container.clientWidth
    ) {
      return;
    }

    appliedBasicCenterSyncKeyRef.current = syncKey;
    container.scrollTo({
      left: getTabCenteredBetweenControlsScrollLeft(container, basicTab),
      behavior: 'instant',
    });
  }, [activeTab, basicTabRef, syncKey, tabsContainerRef]);

  const updateScrollState = useCallback(() => {
    const container = tabsContainerRef.current;
    if (!container) return;

    const { canScrollLeft: nextCanScrollLeft, canScrollRight: nextCanScrollRight } =
      getScrollState(container);
    if (
      scrollStateRef.current.canScrollLeft === nextCanScrollLeft &&
      scrollStateRef.current.canScrollRight === nextCanScrollRight
    ) {
      return;
    }
    scrollStateRef.current = {
      canScrollLeft: nextCanScrollLeft,
      canScrollRight: nextCanScrollRight,
    };
    setCanScrollLeft(nextCanScrollLeft);
    setCanScrollRight(nextCanScrollRight);
  }, [tabsContainerRef]);

  useEffect(() => {
    const container = tabsContainerRef.current;
    if (!container) return;

    const handleLayoutChange = () => {
      applyBasicTabCenteredScroll();
      updateScrollState();
    };

    updateScrollState();

    let rafId2 = 0;
    const rafId1 = requestAnimationFrame(() => {
      rafId2 = requestAnimationFrame(handleLayoutChange);
    });

    container.addEventListener('scroll', updateScrollState, { passive: true });

    const resizeObserver = new ResizeObserver(handleLayoutChange);
    resizeObserver.observe(container);

    const tabsRow = container.firstElementChild;
    if (tabsRow) {
      resizeObserver.observe(tabsRow);
    }

    return () => {
      cancelAnimationFrame(rafId1);
      cancelAnimationFrame(rafId2);
      container.removeEventListener('scroll', updateScrollState);
      resizeObserver.disconnect();
    };
  }, [activeTab, applyBasicTabCenteredScroll, syncKey, tabsContainerRef, updateScrollState]);

  const scrollToAdjacentTab = useCallback(
    (direction: 'left' | 'right') => {
      const container = tabsContainerRef.current;
      if (!container) return;

      const tabs = tabRefs
        .map((tabRef) => tabRef.current)
        .filter((tab): tab is HTMLButtonElement => tab !== null);

      if (direction === 'right') {
        scrollToNextTab(container, tabs);
        return;
      }

      scrollToPreviousTab(container, tabs);
    },
    [tabRefs, tabsContainerRef],
  );

  return { canScrollLeft, canScrollRight, scrollToAdjacentTab };
}

export function SearchTabs({
  variant = 'vehicle',
  activeTab,
  onTabChange,
  hasBasicFilters,
  hasAdvancedFiltersActive,
  hasEquipmentFiltersActive,
  hasPopularFiltersActive,
  basicTabRef,
  advancedTabRef,
  equipmentTabRef,
  popularTabRef,
  indicatorRef,
  indicatorStyle,
  tabsContainerRef,
  switchingLocked = false,
  layoutKey,
}: SearchTabsProps) {
  const { t } = useTranslation();

  const tabRefs = useMemo(
    () =>
      variant === 'tire'
        ? [popularTabRef, basicTabRef]
        : [popularTabRef, basicTabRef, advancedTabRef, equipmentTabRef],
    [advancedTabRef, basicTabRef, equipmentTabRef, popularTabRef, variant],
  );

  const { canScrollLeft, canScrollRight, scrollToAdjacentTab } = useTabScrollAffordance(
    tabsContainerRef,
    tabRefs,
    basicTabRef,
    activeTab,
    `${layoutKey}-${variant}-${activeTab}-${t('searchFilters.basicCriteria')}-${t('searchFilters.additionalCriteria')}-${t('searchFilters.equipment')}-${t('searchFilters.popularFilters')}`,
  );

  const handleTabClick = (tab: 'basic' | 'advanced' | 'equipment' | 'popular') => {
    if (switchingLocked || activeTab === tab) return;
    analytics.searchTabSelect(tab);
    onTabChange(tab);
  };

  const popularTabButton = (
    <button
      ref={popularTabRef}
      type="button"
      data-testid="search-tab-popular"
      disabled={switchingLocked}
      onClick={() => handleTabClick('popular')}
      className={`${tabButtonClass} ${
        activeTab === 'popular'
          ? 'text-primary-900 bg-primary-500/10 rounded-t-lg'
          : 'text-primary-900 hover-only:hover:bg-primary-500/10'
      }`}
      suppressHydrationWarning
    >
      <PopularTabLabel label={t('searchFilters.popularFilters')} />
      {hasPopularFiltersActive && (
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent" />
      )}
    </button>
  );

  const basicTabButton = (
    <button
      ref={basicTabRef}
      type="button"
      data-testid="search-tab-basic"
      disabled={switchingLocked}
      onClick={() => handleTabClick('basic')}
      className={`${tabButtonClass} ${
        activeTab === 'basic'
          ? 'text-primary-900 bg-primary-500/10 rounded-t-lg'
          : 'text-primary-900 hover-only:hover:bg-primary-500/10'
      }`}
      suppressHydrationWarning
    >
      <span suppressHydrationWarning>{t('searchFilters.basicCriteria')}</span>
      {hasBasicFilters && (
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent" />
      )}
    </button>
  );

  const advancedTabButton = (
    <button
      ref={advancedTabRef}
      type="button"
      data-testid="search-tab-advanced"
      disabled={switchingLocked}
      onClick={() => handleTabClick('advanced')}
      className={`${tabButtonClass} ${
        activeTab === 'advanced'
          ? 'text-primary-900 bg-primary-500/10 rounded-t-lg'
          : 'text-primary-900 hover-only:hover:bg-primary-500/10'
      }`}
      suppressHydrationWarning
    >
      <span suppressHydrationWarning>{t('searchFilters.additionalCriteria')}</span>
      {hasAdvancedFiltersActive && (
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent" />
      )}
    </button>
  );

  const equipmentTabButton = (
    <button
      ref={equipmentTabRef}
      type="button"
      data-testid="search-tab-equipment"
      disabled={switchingLocked}
      onClick={() => handleTabClick('equipment')}
      className={`${tabButtonClass} ${
        activeTab === 'equipment'
          ? 'text-primary-900 bg-primary-500/10 rounded-t-lg'
          : 'text-primary-900 hover-only:hover:bg-primary-500/10'
      }`}
      suppressHydrationWarning
    >
      <span suppressHydrationWarning>{t('searchFilters.equipment')}</span>
      {hasEquipmentFiltersActive && (
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent" />
      )}
    </button>
  );

  const indicator = (
    <div
      ref={indicatorRef}
      className="pointer-events-none absolute bottom-0 left-0 h-0.5 bg-primary-400 transition-[transform,width] duration-300 ease-in-out will-change-transform"
      style={{
        transform: `translate3d(${indicatorStyle.left}px, 0, 0)`,
        width: `${indicatorStyle.width}px`,
      }}
    />
  );

  return (
    <div className="relative">
      <div
        ref={tabsContainerRef}
        data-testid="search-tabs-scroll-container"
        className="overflow-x-auto scrollbar-hide"
        suppressHydrationWarning
        aria-busy={switchingLocked}
      >
        <div className="relative flex min-w-max gap-1">
          {popularTabButton}
          {basicTabButton}
          {variant === 'vehicle' && advancedTabButton}
          {variant === 'vehicle' && equipmentTabButton}
          {indicator}
        </div>
      </div>
      {canScrollLeft && (
        <TabScrollEdge
          direction="left"
          ariaLabel={t('searchFilters.showPreviousTabs')}
          onClick={() => scrollToAdjacentTab('left')}
        />
      )}
      {canScrollRight && (
        <TabScrollEdge
          direction="right"
          ariaLabel={t('searchFilters.showNextTabs')}
          onClick={() => scrollToAdjacentTab('right')}
        />
      )}
    </div>
  );
}
