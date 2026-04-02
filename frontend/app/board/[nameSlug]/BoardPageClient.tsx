'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { EmptyState } from '@/components/common/EmptyState';
import { PlatformPartnerBadge } from '@/components/common/PlatformPartnerBadge';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { ListingManagementCard } from '@/components/listing/ListingManagementCard';
import { ListingManagementCardSkeleton } from '@/components/listing/ListingManagementCardSkeleton';
import { LoadMoreButton } from '@/components/listing/LoadMoreButton';
import { SortDropdown } from '@/components/search/SortDropdown';
import { useLoadingState } from '@/hooks/useLoadingState';
import { useTranslation } from '@/hooks/useTranslation';
import { boardApi, type BoardInfo, type Listing, type PaginationMeta } from '@/lib/api';
import { normalizeListingResponse } from '@/lib/api';
import { LISTING_GRID_PAGE_SIZE } from '@/lib/constants';
import { useAuthStore } from '@/lib/store';
import { InfoBlock } from '@/ui';

interface BoardPageClientProps {
  nameSlug: string;
  board: BoardInfo;
  initialSortBy?: string;
  initialSortOrder?: 'ASC' | 'DESC';
}

export default function BoardPageClient({
  nameSlug,
  board,
  initialSortBy,
  initialSortOrder,
}: BoardPageClientProps) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const loadingRef = useRef(false);
  const loadingMoreRef = useRef(false);

  const sortBy = initialSortBy ?? searchParams.get('sortBy') ?? 'created_at';
  const sortOrder = initialSortOrder ?? (searchParams.get('sortOrder') === 'ASC' ? 'ASC' : 'DESC');

  const fetchListings = useCallback(
    async (page: number, append: boolean = false, limit: number = LISTING_GRID_PAGE_SIZE) => {
      if (append && loadingMoreRef.current) return;
      if (!append && loadingRef.current) return;

      if (append) {
        setLoadingMore(true);
        loadingMoreRef.current = true;
      } else {
        setLoading(true);
        loadingRef.current = true;
      }

      try {
        const res = await boardApi.getListings(nameSlug, {
          page,
          limit,
          sortBy,
          sortOrder,
        });
        const normalized = normalizeListingResponse(res.data, page, limit);
        const newListings = normalized.data;
        const responseMeta = normalized.meta;

        if (append) {
          setListings((prev) => {
            const existingIds = new Set(prev.map((l) => l.id));
            const uniqueNew = newListings.filter((l) => !existingIds.has(l.id));
            return [...prev, ...uniqueNew];
          });
          setCurrentPage(page);
        } else {
          setListings(newListings);
          setCurrentPage(page);
        }
        setMeta(responseMeta);
      } catch {
        if (!append) setListings([]);
      } finally {
        setLoadingMore(false);
        loadingMoreRef.current = false;
        if (!append) {
          setLoading(false);
          loadingRef.current = false;
        }
      }
    },
    [nameSlug, sortBy, sortOrder],
  );

  useEffect(() => {
    void fetchListings(1, false);
  }, [fetchListings]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore || !meta || !meta.totalPages || currentPage >= meta.totalPages) return;
    void fetchListings(currentPage + 1, true);
  }, [loadingMore, meta, currentPage, fetchListings]);

  const { visible: showSkeleton } = useLoadingState({
    isLoading: loading,
    minDisplayTime: 1000,
    immediate: true,
    showDelay: 0,
  });
  const isOwner = user?.id === board.userId;
  const pageTitle = t('board.title', { sellerName: board.displayName });

  return (
    <div className="min-h-[calc(100vh-200px)]">
      <Breadcrumbs
        items={[{ label: t('board.home'), href: '/' }, { label: pageTitle }]}
        className="mb-6"
      />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
        <div className="flex flex-wrap items-center gap-2 md:gap-3 min-w-0">
          <h1 className="text-3xl md:text-4xl font-extrabold text-primary-900">{pageTitle}</h1>
          {board.isPlatformPartner && <PlatformPartnerBadge elevated />}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <SortDropdown basePath={`/board/${nameSlug}`} />
        </div>
      </div>

      {isOwner && (
        <InfoBlock title={t('board.ownerNoticeTitle')} className="mb-6">
          {t('board.ownerNoticeText')}
        </InfoBlock>
      )}

      {showSkeleton && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <ListingManagementCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!showSkeleton && listings.length === 0 && <EmptyState message={t('board.noListings')} />}

      {!showSkeleton && listings.length > 0 && (
        <>
          <div className="space-y-4">
            {listings.map((listing) => (
              <ListingManagementCard key={listing.id} listing={listing} mode="board" />
            ))}
          </div>

          {(() => {
            const hasMore = meta && meta.totalPages && currentPage < meta.totalPages;

            return (
              <>
                {(hasMore || loadingMore) && (
                  <LoadMoreButton
                    onClick={handleLoadMore}
                    loading={loadingMore}
                    disabled={loadingMore}
                  >
                    {t('listings.showMore')}
                  </LoadMoreButton>
                )}

                {!hasMore && listings.length > 0 && !loadingMore && (
                  <div className="text-center pt-8 pb-0">
                    <p style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
                      {t('listings.noMoreListings')}
                    </p>
                  </div>
                )}
              </>
            );
          })()}
        </>
      )}
    </div>
  );
}
