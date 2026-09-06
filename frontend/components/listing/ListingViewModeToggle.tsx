'use client';

import { useTranslation } from '@/hooks/useTranslation';
import { setListingViewMode, useListingViewMode } from '@/lib/listing-view-mode';
import { ViewCompactCardsIcon, ViewLargeCardsIcon } from '@/ui';

const buttonBaseClass =
  'inline-flex h-full w-full min-w-0 items-center justify-center gap-1 rounded-md border px-1.5 text-sm font-semibold select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base cursor-pointer';

function viewModeButtonClass(active: boolean): string {
  if (active) {
    return `${buttonBaseClass} border-primary-700 bg-primary-500/10 text-primary-700`;
  }
  return `${buttonBaseClass} border-transparent text-text-secondary hover-only:hover:bg-primary-500/5`;
}

export function ListingViewModeToggle() {
  const { t } = useTranslation();
  const viewMode = useListingViewMode();
  const compact = viewMode === 'compact';

  return (
    <div className="md:hidden mb-3">
      <div
        role="group"
        aria-label={t('listings.viewModeLabel')}
        className="grid h-12 w-full grid-cols-2 items-center rounded-lg border border-primary-500/20 bg-bg-secondary p-0.5"
      >
        <button
          type="button"
          aria-pressed={!compact}
          data-testid="listing-view-mode-large"
          className={viewModeButtonClass(!compact)}
          onClick={() => setListingViewMode('large')}
        >
          <ViewLargeCardsIcon className="w-4 h-4 shrink-0" />
          <span className="truncate">{t('listings.viewModeLarge')}</span>
        </button>
        <button
          type="button"
          aria-pressed={compact}
          data-testid="listing-view-mode-compact"
          className={viewModeButtonClass(compact)}
          onClick={() => setListingViewMode('compact')}
        >
          <ViewCompactCardsIcon className="w-4 h-4 shrink-0" />
          <span className="truncate">{t('listings.viewModeCompact')}</span>
        </button>
      </div>
    </div>
  );
}
