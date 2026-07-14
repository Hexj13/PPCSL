import type { VirtualRow } from './buildVirtualRows';

export const LISTING_GRID_ROW_GAP_PX = 24;

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

export function resolveVirtualContainerHeight(
  virtualTotalSize: number,
  virtualRenderedBottom: number,
  domRenderedBottom: number,
): number {
  return Math.max(virtualTotalSize, virtualRenderedBottom, domRenderedBottom);
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

    let maxCardHeight = 0;
    let measuredCardCount = 0;

    for (const item of row.items) {
      const card = gridEl.querySelector<HTMLElement>(
        `[data-testid="listing-card-${item.listing.id}"]`,
      );
      if (!card || card.offsetHeight <= 0) {
        continue;
      }
      measuredCardCount += 1;
      maxCardHeight = Math.max(maxCardHeight, card.offsetHeight);
    }

    if (measuredCardCount === 0) {
      return undefined;
    }

    return maxCardHeight;
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
