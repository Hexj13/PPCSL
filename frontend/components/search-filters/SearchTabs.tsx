'use client';

import { useTranslation } from '@/hooks/useTranslation';

interface SearchTabsProps {
  activeTab: 'basic' | 'advanced' | 'popular';
  onTabChange: (_tab: 'basic' | 'advanced' | 'popular') => void;
  hasBasicFilters: boolean;
  hasAdvancedFiltersActive: boolean;
  basicTabRef: React.RefObject<HTMLButtonElement>;
  advancedTabRef: React.RefObject<HTMLButtonElement>;
  popularTabRef: React.RefObject<HTMLButtonElement>;
  indicatorRef: React.RefObject<HTMLDivElement>;
  indicatorStyle: { left: number; width: number };
  tabsContainerRef: React.RefObject<HTMLDivElement>;
  showFade: boolean;
}

export function SearchTabs({
  activeTab,
  onTabChange,
  hasBasicFilters,
  hasAdvancedFiltersActive,
  basicTabRef,
  advancedTabRef,
  popularTabRef,
  indicatorRef,
  indicatorStyle,
  tabsContainerRef,
  showFade,
}: SearchTabsProps) {
  const { t } = useTranslation();

  return (
    <div ref={tabsContainerRef} className="relative flex gap-1 overflow-x-auto scrollbar-hide">
      <button
        ref={basicTabRef}
        type="button"
        onClick={() => onTabChange('basic')}
        className={`px-4 py-3 text-base font-semibold transition-all duration-300 relative z-10 flex-shrink-0 whitespace-nowrap ${
          activeTab === 'basic'
            ? 'text-text-primary bg-primary-500/5 rounded-t-lg'
            : 'text-text-primary hover:bg-primary-500/5'
        }`}
      >
        {t('searchFilters.basicCriteria')}
        {hasBasicFilters && (
          <span className="absolute right-2 top-2 w-2 h-2 rounded-full bg-accent" />
        )}
      </button>
      <button
        ref={advancedTabRef}
        type="button"
        onClick={() => onTabChange('advanced')}
        className={`px-4 py-3 text-base font-semibold transition-all duration-300 relative z-10 flex-shrink-0 whitespace-nowrap ${
          activeTab === 'advanced'
            ? 'text-text-primary bg-primary-500/5 rounded-t-lg'
            : 'text-text-primary hover:bg-primary-500/5'
        }`}
      >
        {t('searchFilters.additionalCriteria')}
        {hasAdvancedFiltersActive && (
          <span className="absolute right-2 top-2 w-2 h-2 rounded-full bg-accent" />
        )}
      </button>
      <button
        ref={popularTabRef}
        type="button"
        onClick={() => onTabChange('popular')}
        className={`px-4 py-3 text-base font-semibold transition-all duration-300 relative z-10 flex-shrink-0 whitespace-nowrap ${
          activeTab === 'popular'
            ? 'text-text-primary bg-primary-500/5 rounded-t-lg'
            : 'text-text-primary hover:bg-primary-500/5'
        }`}
      >
        {t('searchFilters.popularFilters')}
      </button>
      <div
        ref={indicatorRef}
        className="absolute bottom-0 h-0.5 bg-primary-400 transition-all duration-300 ease-in-out"
        style={{
          left: `${indicatorStyle.left}px`,
          width: `${indicatorStyle.width}px`,
        }}
      />
      {showFade && (
        <div
          className="lg:hidden absolute top-0 bottom-0 w-24 pointer-events-none z-20"
          style={{
            right: '0px',
            background:
              'linear-gradient(to left, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.95) 20%, rgba(255, 255, 255, 0.7) 50%, rgba(255, 255, 255, 0.3) 80%, rgba(255, 255, 255, 0) 100%)',
          }}
        />
      )}
    </div>
  );
}
