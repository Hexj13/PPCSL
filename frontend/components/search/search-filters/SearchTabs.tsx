'use client';

import { useTranslation } from '@/hooks/useTranslation';

interface SearchTabsProps {
  activeTab: 'basic' | 'advanced' | 'equipment' | 'popular';
  onTabChange: (_tab: 'basic' | 'advanced' | 'equipment' | 'popular') => void;
  hasBasicFilters: boolean;
  hasAdvancedFiltersActive: boolean;
  hasEquipmentFiltersActive: boolean;
  basicTabRef: React.RefObject<HTMLButtonElement | null>;
  advancedTabRef: React.RefObject<HTMLButtonElement | null>;
  equipmentTabRef: React.RefObject<HTMLButtonElement | null>;
  popularTabRef: React.RefObject<HTMLButtonElement | null>;
  indicatorRef: React.RefObject<HTMLDivElement | null>;
  indicatorStyle: { left: number; width: number };
  tabsContainerRef: React.RefObject<HTMLDivElement | null>;
  showFade: boolean;
  fadeOpacity: number;
}

export function SearchTabs({
  activeTab,
  onTabChange,
  hasBasicFilters,
  hasAdvancedFiltersActive,
  hasEquipmentFiltersActive,
  basicTabRef,
  advancedTabRef,
  equipmentTabRef,
  popularTabRef,
  indicatorRef,
  indicatorStyle,
  tabsContainerRef,
  showFade,
  fadeOpacity,
}: SearchTabsProps) {
  const { t } = useTranslation();

  return (
    <div className="relative">
      <div
        ref={tabsContainerRef}
        className="overflow-x-auto scrollbar-hide"
        suppressHydrationWarning
      >
        <div className="relative flex gap-1 min-w-max">
          <button
            ref={basicTabRef}
            type="button"
            onClick={() => activeTab !== 'basic' && onTabChange('basic')}
            className={`px-4 py-3 text-base font-semibold transition-all duration-300 relative z-10 shrink-0 whitespace-nowrap ${
              activeTab === 'basic'
                ? 'text-primary-900 bg-primary-500/10 rounded-t-lg'
                : 'text-primary-900 hover-only:hover:bg-primary-500/10'
            }`}
            suppressHydrationWarning
          >
            <span suppressHydrationWarning>{t('searchFilters.basicCriteria')}</span>
            {hasBasicFilters && (
              <span className="absolute right-2 top-2 w-2 h-2 rounded-full bg-accent" />
            )}
          </button>
          <button
            ref={advancedTabRef}
            type="button"
            onClick={() => activeTab !== 'advanced' && onTabChange('advanced')}
            className={`px-4 py-3 text-base font-semibold transition-all duration-300 relative z-10 shrink-0 whitespace-nowrap ${
              activeTab === 'advanced'
                ? 'text-primary-900 bg-primary-500/10 rounded-t-lg'
                : 'text-primary-900 hover-only:hover:bg-primary-500/10'
            }`}
            suppressHydrationWarning
          >
            <span suppressHydrationWarning>{t('searchFilters.additionalCriteria')}</span>
            {hasAdvancedFiltersActive && (
              <span className="absolute right-2 top-2 w-2 h-2 rounded-full bg-accent" />
            )}
          </button>
          <button
            ref={equipmentTabRef}
            type="button"
            onClick={() => activeTab !== 'equipment' && onTabChange('equipment')}
            className={`px-4 py-3 text-base font-semibold transition-all duration-300 relative z-10 shrink-0 whitespace-nowrap ${
              activeTab === 'equipment'
                ? 'text-primary-900 bg-primary-500/10 rounded-t-lg'
                : 'text-primary-900 hover-only:hover:bg-primary-500/10'
            }`}
            suppressHydrationWarning
          >
            <span suppressHydrationWarning>{t('searchFilters.equipment')}</span>
            {hasEquipmentFiltersActive && (
              <span className="absolute right-2 top-2 w-2 h-2 rounded-full bg-accent" />
            )}
          </button>
          <button
            ref={popularTabRef}
            type="button"
            onClick={() => activeTab !== 'popular' && onTabChange('popular')}
            className={`px-4 py-3 text-base font-semibold transition-all duration-300 relative z-10 shrink-0 whitespace-nowrap ${
              activeTab === 'popular'
                ? 'text-primary-900 bg-primary-500/10 rounded-t-lg'
                : 'text-primary-900 hover-only:hover:bg-primary-500/10'
            }`}
            suppressHydrationWarning
          >
            <span suppressHydrationWarning>{t('searchFilters.popularFilters')}</span>
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
      {showFade && (
        <div
          className="lg:hidden absolute top-0 -right-px bottom-0 w-14 pointer-events-none z-20 transition-opacity duration-200"
          style={{
            opacity: fadeOpacity,
            background:
              'linear-gradient(to left, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 50%, rgba(255, 255, 255, 0.5) 100%)',
          }}
        />
      )}
    </div>
  );
}
