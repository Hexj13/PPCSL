'use client';

import { useTranslation } from '@/hooks/useTranslation';
import { analytics } from '@/lib/analytics';
import { StarIcon } from '@/ui';

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
  showFade: boolean;
  fadeOpacity: number;
  switchingLocked?: boolean;
}

const tabButtonClass =
  'px-4 py-3 text-base font-semibold transition-[background-color,border-radius,color] duration-300 relative z-10 shrink-0 whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-60';

function PopularTabLabel({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5" suppressHydrationWarning>
      <StarIcon className="w-4 h-4 shrink-0" aria-hidden />
      <span suppressHydrationWarning>{label}</span>
    </span>
  );
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
  showFade,
  fadeOpacity,
  switchingLocked = false,
}: SearchTabsProps) {
  const { t } = useTranslation();

  const handleTabClick = (tab: 'basic' | 'advanced' | 'equipment' | 'popular') => {
    if (switchingLocked || activeTab === tab) return;
    analytics.searchTabSelect(tab);
    onTabChange(tab);
  };

  if (variant === 'tire') {
    return (
      <div className="relative">
        <div
          ref={tabsContainerRef}
          className="overflow-x-auto scrollbar-hide"
          suppressHydrationWarning
          aria-busy={switchingLocked}
        >
          <div className="relative flex gap-1 min-w-max">
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
                <span className="absolute right-2 top-2 w-2 h-2 rounded-full bg-accent" />
              )}
            </button>
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
                <span className="absolute right-2 top-2 w-2 h-2 rounded-full bg-accent" />
              )}
            </button>
            <div
              ref={indicatorRef}
              className="absolute bottom-0 left-0 h-0.5 bg-primary-700 transition-[transform,width] duration-300 ease-in-out pointer-events-none will-change-transform"
              style={{
                transform: `translate3d(${indicatorStyle.left}px, 0, 0)`,
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

  return (
    <div className="relative">
      <div
        ref={tabsContainerRef}
        className="overflow-x-auto scrollbar-hide"
        suppressHydrationWarning
        aria-busy={switchingLocked}
      >
        <div className="relative flex gap-1 min-w-max">
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
              <span className="absolute right-2 top-2 w-2 h-2 rounded-full bg-accent" />
            )}
          </button>
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
              <span className="absolute right-2 top-2 w-2 h-2 rounded-full bg-accent" />
            )}
          </button>
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
              <span className="absolute right-2 top-2 w-2 h-2 rounded-full bg-accent" />
            )}
          </button>
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
              <span className="absolute right-2 top-2 w-2 h-2 rounded-full bg-accent" />
            )}
          </button>
          <div
            ref={indicatorRef}
            className="absolute bottom-0 left-0 h-0.5 bg-primary-700 transition-[transform,width] duration-300 ease-in-out pointer-events-none will-change-transform"
            style={{
              transform: `translate3d(${indicatorStyle.left}px, 0, 0)`,
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
