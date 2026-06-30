import type { VirtualRow } from './buildVirtualRows';

export const LISTING_GRID_ROW_GAP_PX = 24;

export const LISTING_GRID_VIRTUAL_BOTTOM_BUFFER_PX = 16;

export type StaticGridSwapMetrics = {
  rowHeights: (number | undefined)[];
  gridOffsetTop: number;
};

export function resolveVirtualRowSize(
  _rowIndex: number,
  _rowCount: number,
  contentHeight: number | undefined,
  fallbackHeight: number,
): number {
  return contentHeight ?? fallbackHeight;
}

export function measureStaticRowHeights(
  gridEl: HTMLElement,
  rows: VirtualRow[],
): (number | undefined)[] {
  return rows.map((row) => {
    if (row.kind === 'banner') {
      const banner = gridEl.querySelector('[data-testid="partner-promo-banner"]');
      const bannerWrap = banner?.closest('.col-span-full') ?? banner?.parentElement;
      const height =
        bannerWrap?.getBoundingClientRect().height ?? banner?.getBoundingClientRect().height;
      if (!height || height <= 0) {
        return undefined;
      }
      return height;
    }

    const firstListingId = row.items[0]?.listing.id;
    if (!firstListingId) {
      return undefined;
    }

    const card = gridEl.querySelector<HTMLElement>(
      `[data-testid="listing-card-${firstListingId}"]`,
    );
    if (!card || card.offsetHeight <= 0) {
      return undefined;
    }

    return card.offsetHeight;
  });
}

export function measureStaticGridSwapMetrics(
  gridEl: HTMLElement,
  rows: VirtualRow[],
): StaticGridSwapMetrics {
  return {
    rowHeights: measureStaticRowHeights(gridEl, rows),
    gridOffsetTop: gridEl.offsetTop,
  };
}
