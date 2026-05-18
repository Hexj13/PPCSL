import type { ReactNode } from 'react';

import {
  BadgesSkeleton,
  BreadcrumbsSkeletonDecorative,
  FavoriteButtonSkeleton,
  MainImageSkeleton,
  PriceSkeleton,
  ThumbnailsSkeleton,
  TitleSkeleton,
} from '@/components/listing/ListingPageSkeleton';
import {
  LISTING_DETAIL_PAGE_ROOT_CLASS,
  LISTING_DETAIL_TOP_GRID_CLASS,
} from '@/components/listing/listing-detail-layout';

export function ListingDetailPageSkeleton({ breadcrumb }: { breadcrumb: ReactNode }) {
  return (
    <div className={LISTING_DETAIL_PAGE_ROOT_CLASS} data-testid="listing-detail-page">
      <div className={LISTING_DETAIL_TOP_GRID_CLASS}>
        <div className="space-y-6 min-w-0 order-1">
          <div>
            <MainImageSkeleton />
            <ThumbnailsSkeleton />
          </div>
        </div>
        <div className="order-2 lg:order-3 lg:col-span-2">{breadcrumb}</div>
        <div className="space-y-6 min-w-0 order-3 lg:order-2">
          <div>
            <TitleSkeleton />
            <PriceSkeleton />
            <BadgesSkeleton />
            <div className="mt-8">
              <FavoriteButtonSkeleton />
            </div>
          </div>
        </div>
      </div>
      <div className="my-6 border-t-0 lg:border-t border-primary-500/20" />
      <div
        className="h-32 max-w-md mx-auto rounded-xl bg-bg-secondary/20 animate-pulse"
        aria-hidden
      />
    </div>
  );
}

export function ListingDetailRouteSkeleton() {
  return (
    <div aria-busy="true">
      <ListingDetailPageSkeleton breadcrumb={<BreadcrumbsSkeletonDecorative />} />
    </div>
  );
}
