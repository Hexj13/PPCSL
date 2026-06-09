'use client';

import { useWindowVirtualizer } from '@tanstack/react-virtual';
import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useGridColumns } from '@/hooks/useGridColumns';
import type { Listing } from '@/lib/api';
import {
  LISTING_GRID_SCROLL_TO_LISTING_EVENT,
  type ListingGridScrollToListingDetail,
} from '@/lib/listing-grid-scroll-bridge';
import { addCoalescedResizeListener } from '@/lib/resize-coalesced';

import { ListingCard } from './ListingCard';
import { PartnerPromoBanner } from './PartnerPromoBanner';
import {
  buildVirtualRows,
  getBannerVariantClassName,
  getVirtualRowEstimateSize,
} from './buildVirtualRows';

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
  return (
    <div
      id="listings-results"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch"
      data-testid="listings-results-grid"
    >
      {listings.map((listing, index) => {
        const cardPosition = index + 1;

        return (
          <Fragment key={listing.id}>
            <ListingCard
              listing={listing}
              priority={index < 6}
              linkPrefetch={index < LISTING_GRID_LINK_PREFETCH_COUNT}
            />
            {showPartnerPromoBanner && cardPosition === 6 && (
              <div className="col-span-full lg:hidden">
                <PartnerPromoBanner onDismiss={onDismissPartnerPromoBanner} />
              </div>
            )}
            {showPartnerPromoBanner && cardPosition === 9 && (
              <div className="col-span-full hidden lg:block xl:hidden">
                <PartnerPromoBanner onDismiss={onDismissPartnerPromoBanner} />
              </div>
            )}
            {showPartnerPromoBanner && cardPosition === 12 && (
              <div className="col-span-full hidden xl:block">
                <PartnerPromoBanner onDismiss={onDismissPartnerPromoBanner} />
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

function VirtualizedListingGridContent({
  listings,
  showPartnerPromoBanner,
  onDismissPartnerPromoBanner,
}: VirtualizedListingGridProps) {
  const columns = useGridColumns();
  const parentRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  const { rows, listingRowIndexById } = useMemo(
    () => buildVirtualRows(listings, columns, { showPartnerPromoBanner }),
    [listings, columns, showPartnerPromoBanner],
  );

  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: (index) => getVirtualRowEstimateSize(rows[index]),
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

  const scrollToListing = useCallback(
    (listingId: string) => {
      const rowIndex = listingRowIndexById.get(listingId);
      if (rowIndex === undefined) {
        return false;
      }
      virtualizer.scrollToIndex(rowIndex, { align: 'start', behavior: 'instant' });
      return true;
    },
    [listingRowIndexById, virtualizer],
  );

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<ListingGridScrollToListingDetail>).detail;
      const listingId = detail?.listingId;
      if (!listingId) {
        return;
      }
      scrollToListing(listingId);
    };

    window.addEventListener(LISTING_GRID_SCROLL_TO_LISTING_EVENT, handler);
    return () => window.removeEventListener(LISTING_GRID_SCROLL_TO_LISTING_EVENT, handler);
  }, [scrollToListing]);

  const gridColsClass = GRID_COLS_CLASS[columns] ?? 'grid-cols-1';

  return (
    <div
      id="listings-results"
      ref={parentRef}
      className="relative w-full"
      data-testid="listings-results-grid"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index];

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className="absolute top-0 left-0 w-full pb-6"
              style={{
                transform: `translateY(${virtualRow.start - virtualizer.options.scrollMargin}px)`,
              }}
            >
              {row.kind === 'banner' ? (
                <div className={getBannerVariantClassName(row.variant)}>
                  <PartnerPromoBanner onDismiss={onDismissPartnerPromoBanner} />
                </div>
              ) : (
                <div className={`grid ${gridColsClass} gap-6 items-stretch`}>
                  {row.items.map(({ listing, index }) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      priority={index < 6}
                      linkPrefetch={index < LISTING_GRID_LINK_PREFETCH_COUNT}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function VirtualizedListingGrid(props: VirtualizedListingGridProps) {
  const [virtualizationReady, setVirtualizationReady] = useState(false);

  useEffect(() => {
    setVirtualizationReady(true);
  }, []);

  if (!virtualizationReady) {
    return <StaticListingGrid {...props} />;
  }

  return <VirtualizedListingGridContent {...props} />;
}
