'use client';

import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { Fragment, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { useListingGridColumns } from '@/hooks/useGridColumns';
import type { Listing } from '@/lib/api';
import {
  applyHomeScrollRestoreScrollPosition,
  getHomeScrollRestorePhase,
  isHomeScrollRestoreInProgress,
  reapplyHomeScrollRestoreScrollPosition,
  shouldDeferVirtualSwapForHomeScrollRestore,
} from '@/lib/home-scroll-restore';
import { addCoalescedResizeListener } from '@/lib/resize-coalesced';

import { ListingCard } from './ListingCard';
import { PartnerPromoBanner } from './PartnerPromoBanner';
import {
  buildVirtualRows,
  getBannerVariantClassName,
  getVirtualRowEstimateSize,
} from './buildVirtualRows';
import { LISTING_GRID_PRIORITY_CARD_COUNT } from './listing-card-image';
import {
  ListingGridCriticalStyles,
  listingGridResponsiveClassName,
  listingGridRowCriticalStyle,
} from './listing-grid-critical-layout';
import {
  LISTING_GRID_ROW_GAP_PX,
  measureStaticGridSwapMetrics,
  resolveVirtualContainerHeight,
  resolveVirtualRowSize,
  type StaticGridSwapMetrics,
} from './listing-grid-measure';
import { registerListingGridVirtualSwapListener } from './listing-grid-virtual-swap';

const LISTING_GRID_LINK_PREFETCH_COUNT = 4;

const GRID_COLS_CLASS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
};

type VirtualizedListingGridProps = {
  listings: Listing[];
  showPartnerPromoBanner: boolean;
  onDismissPartnerPromoBanner: () => void;
};

function StaticListingGrid({
  listings,
  showPartnerPromoBanner,
  onDismissPartnerPromoBanner,
}: VirtualizedListingGridProps) {
  const { columns, compactCards } = useListingGridColumns();
  const partnerPromoPosition = showPartnerPromoBanner
    ? columns >= 4
      ? 12
      : columns === 3
        ? 9
        : 6
    : null;
  const cardVariant = compactCards ? 'compact' : 'default';

  return (
    <>
      <ListingGridCriticalStyles />
      <div
        id="listings-results"
        className={listingGridResponsiveClassName(compactCards)}
        data-testid="listings-results-grid"
      >
        {listings.map((listing, index) => {
          const cardPosition = index + 1;

          return (
            <Fragment key={listing.id}>
              <ListingCard
                listing={listing}
                variant={cardVariant}
                priority={index < LISTING_GRID_PRIORITY_CARD_COUNT}
                linkPrefetch={index < LISTING_GRID_LINK_PREFETCH_COUNT}
                enableCarouselPreload={index < LISTING_GRID_PRIORITY_CARD_COUNT}
              />
              {partnerPromoPosition === cardPosition && (
                <div className="col-span-full">
                  <PartnerPromoBanner onDismiss={onDismissPartnerPromoBanner} />
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </>
  );
}

type VirtualizedListingGridContentProps = VirtualizedListingGridProps & {
  swapMetrics: StaticGridSwapMetrics;
};

function scheduleVirtualGridLayoutReconcile(onReconcile: () => void): () => void {
  let cancelled = false;
  let rafId2: number | undefined;

  const bump = () => {
    if (!cancelled) {
      onReconcile();
    }
  };

  const rafId1 = requestAnimationFrame(() => {
    rafId2 = requestAnimationFrame(bump);
  });

  const fontsReady = document.fonts?.ready;
  if (fontsReady) {
    void fontsReady.then(bump).catch(() => {});
  }

  return () => {
    cancelled = true;
    cancelAnimationFrame(rafId1);
    if (rafId2 !== undefined) {
      cancelAnimationFrame(rafId2);
    }
  };
}

function VirtualizedListingGridContent({
  listings,
  showPartnerPromoBanner,
  onDismissPartnerPromoBanner,
  swapMetrics,
}: VirtualizedListingGridContentProps) {
  const { columns, compactCards } = useListingGridColumns();
  const parentRef = useRef<HTMLDivElement>(null);
  const renderedInnerRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(swapMetrics.gridOffsetTop);
  const [domRenderedBottom, setDomRenderedBottom] = useState(0);
  const [, setLayoutReconcileTick] = useState(0);

  const { rows } = useMemo(
    () => buildVirtualRows(listings, columns, { showPartnerPromoBanner }),
    [listings, columns, showPartnerPromoBanner],
  );

  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: (index) =>
      resolveVirtualRowSize(
        index,
        rows.length,
        swapMetrics.rowHeights[index],
        getVirtualRowEstimateSize(rows[index], columns, compactCards),
      ),
    gap: LISTING_GRID_ROW_GAP_PX,
    overscan: 4,
    scrollMargin,
    getItemKey: (index) => {
      const row = rows[index];
      if (row.kind === 'banner') {
        return `banner-${row.variant}-${index}`;
      }
      return `cards-${row.items.map((item) => item.listing.id).join('-')}`;
    },
  });

  useLayoutEffect(() => {
    const updateScrollMargin = () => {
      if (parentRef.current) {
        setScrollMargin(parentRef.current.offsetTop);
      }
    };
    updateScrollMargin();
    return addCoalescedResizeListener(updateScrollMargin);
  }, [columns]);

  useLayoutEffect(() => {
    return scheduleVirtualGridLayoutReconcile(() => {
      setLayoutReconcileTick((tick) => tick + 1);
    });
  }, [rows.length]);

  const gridColsClass = GRID_COLS_CLASS[columns] ?? 'grid-cols-1';
  const cardVariant = compactCards ? 'compact' : 'default';

  const virtualRows = virtualizer.getVirtualItems();
  const firstVirtualRow = virtualRows[0];
  const lastVirtualRow = virtualRows[virtualRows.length - 1];
  const windowOffset = (firstVirtualRow?.start ?? 0) - virtualizer.options.scrollMargin;
  const virtualRenderedBottom = lastVirtualRow
    ? lastVirtualRow.end - virtualizer.options.scrollMargin
    : 0;
  const firstVirtualRowIndex = firstVirtualRow?.index ?? -1;
  const lastVirtualRowIndex = lastVirtualRow?.index ?? -1;

  useLayoutEffect(() => {
    const parentEl = parentRef.current;
    const renderedInnerEl = renderedInnerRef.current;
    if (!parentEl || !renderedInnerEl) {
      return;
    }

    const updateDomRenderedBottom = () => {
      const nextBottom =
        renderedInnerEl.getBoundingClientRect().bottom - parentEl.getBoundingClientRect().top;
      setDomRenderedBottom((prev) => (prev === nextBottom ? prev : nextBottom));
    };

    updateDomRenderedBottom();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(updateDomRenderedBottom);
    observer.observe(renderedInnerEl);
    return () => {
      observer.disconnect();
    };
  }, [columns, firstVirtualRowIndex, lastVirtualRowIndex, rows.length]);

  const containerHeight = resolveVirtualContainerHeight(
    virtualizer.getTotalSize(),
    virtualRenderedBottom,
    domRenderedBottom,
  );

  return (
    <>
      <ListingGridCriticalStyles />
      <div
        id="listings-results"
        ref={parentRef}
        className="relative w-full"
        data-testid="listings-results-grid"
      >
        <div
          style={{
            height: `${containerHeight}px`,
            width: '100%',
            position: 'relative',
            overflowAnchor: 'none',
          }}
        >
          <div
            ref={renderedInnerRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${windowOffset}px)`,
              display: 'flex',
              flexDirection: 'column',
              rowGap: `${LISTING_GRID_ROW_GAP_PX}px`,
              overflowAnchor: 'none',
            }}
          >
            {virtualRows.map((virtualRow) => {
              const row = rows[virtualRow.index];

              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  className="w-full"
                >
                  {row.kind === 'banner' ? (
                    <div className={getBannerVariantClassName(row.variant)}>
                      <PartnerPromoBanner onDismiss={onDismissPartnerPromoBanner} />
                    </div>
                  ) : (
                    <div
                      className={`grid ${gridColsClass} gap-6 items-stretch${compactCards ? ' gap-x-3' : ''}`}
                      style={listingGridRowCriticalStyle(columns, compactCards)}
                    >
                      {row.items.map(({ listing, index }) => (
                        <ListingCard
                          key={listing.id}
                          listing={listing}
                          variant={cardVariant}
                          priority={index < LISTING_GRID_PRIORITY_CARD_COUNT}
                          linkPrefetch={index < LISTING_GRID_LINK_PREFETCH_COUNT}
                          enableCarouselPreload={index < LISTING_GRID_PRIORITY_CARD_COUNT}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

export function VirtualizedListingGrid(props: VirtualizedListingGridProps) {
  const { columns } = useListingGridColumns();
  const [virtualized, setVirtualized] = useState(false);
  const swapMetricsRef = useRef<StaticGridSwapMetrics | null>(null);

  const { rows: initialRows } = useMemo(
    () =>
      buildVirtualRows(props.listings, columns, {
        showPartnerPromoBanner: props.showPartnerPromoBanner,
      }),
    [props.listings, columns, props.showPartnerPromoBanner],
  );

  useLayoutEffect(() => {
    const trySwap = () => {
      if (virtualized || shouldDeferVirtualSwapForHomeScrollRestore()) {
        return;
      }
      const gridEl = document.getElementById('listings-results');
      if (!gridEl) {
        return;
      }
      swapMetricsRef.current = measureStaticGridSwapMetrics(gridEl, initialRows);
      setVirtualized(true);
    };

    const unregister = registerListingGridVirtualSwapListener(trySwap);
    if (!shouldDeferVirtualSwapForHomeScrollRestore()) {
      trySwap();
    }
    return unregister;
  }, [virtualized, initialRows]);

  useLayoutEffect(() => {
    if (!virtualized) {
      return;
    }

    const reapplyScrollAfterVirtualSwap = () => {
      if (!isHomeScrollRestoreInProgress()) {
        return;
      }
      if (getHomeScrollRestorePhase() === 'pending') {
        applyHomeScrollRestoreScrollPosition();
        return;
      }
      reapplyHomeScrollRestoreScrollPosition();
    };

    reapplyScrollAfterVirtualSwap();
    const rafId = requestAnimationFrame(reapplyScrollAfterVirtualSwap);
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [virtualized]);

  if (!virtualized || !swapMetricsRef.current) {
    return <StaticListingGrid {...props} />;
  }

  return <VirtualizedListingGridContent {...props} swapMetrics={swapMetricsRef.current} />;
}
