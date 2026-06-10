import type { CSSProperties } from 'react';

export const LISTING_GRID_CRITICAL_GAP = '1.5rem';

export const listingGridCriticalBaseStyle: CSSProperties = {
  display: 'grid',
  gap: LISTING_GRID_CRITICAL_GAP,
  alignItems: 'stretch',
  gridTemplateColumns: 'minmax(0, 1fr)',
};

export function listingGridRowCriticalStyle(columns: number): CSSProperties {
  return {
    display: 'grid',
    gap: LISTING_GRID_CRITICAL_GAP,
    alignItems: 'stretch',
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
  };
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
