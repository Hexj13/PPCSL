import type { CSSProperties } from 'react';

export const LISTING_GRID_CRITICAL_GAP = '1.5rem';
export const LISTING_GRID_COMPACT_COLUMN_GAP = '0.75rem';

export const listingGridCriticalBaseStyle: CSSProperties = {
  display: 'grid',
  gap: LISTING_GRID_CRITICAL_GAP,
  alignItems: 'stretch',
  gridTemplateColumns: 'minmax(0, 1fr)',
};

export function listingGridRowCriticalStyle(columns: number, compactCards = false): CSSProperties {
  return {
    display: 'grid',
    gap: LISTING_GRID_CRITICAL_GAP,
    ...(compactCards ? { columnGap: LISTING_GRID_COMPACT_COLUMN_GAP } : {}),
    alignItems: 'stretch',
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
  };
}

export function listingGridResponsiveClassName(compactCards: boolean): string {
  const columnClasses = compactCards
    ? 'grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 gap-x-3'
    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6';
  return [
    'listing-grid-critical-responsive',
    compactCards ? 'listing-grid-critical-compact' : '',
    'grid',
    columnClasses,
    'items-stretch',
  ]
    .filter(Boolean)
    .join(' ');
}

export function ListingGridCriticalStyles() {
  return (
    <style>{`
      .listing-grid-critical-responsive {
        display: grid;
        gap: ${LISTING_GRID_CRITICAL_GAP};
        align-items: stretch;
        grid-template-columns: minmax(0, 1fr);
      }
      @media (max-width: 767px) {
        .listing-grid-critical-compact {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          column-gap: ${LISTING_GRID_COMPACT_COLUMN_GAP};
        }
      }
      @media (min-width: 768px) {
        .listing-grid-critical-responsive {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (min-width: 1024px) {
        .listing-grid-critical-responsive {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }
      @media (min-width: 1280px) {
        .listing-grid-critical-responsive {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
      }
    `}</style>
  );
}
