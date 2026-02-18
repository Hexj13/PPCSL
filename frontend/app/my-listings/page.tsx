'use client';

import Link from 'next/link';

import { useMyListingsPage } from '@/app/my-listings/useMyListingsPage';
import { EmptyState } from '@/components/common/EmptyState';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { ListingManagementCard } from '@/components/listing/ListingManagementCard';
import { ListingManagementCardSkeleton } from '@/components/listing/ListingManagementCardSkeleton';
import { LoadMoreButton } from '@/components/listing/LoadMoreButton';
import { StatusFilterButtons } from '@/components/listing/StatusFilterButtons';
import { Modal } from '@/components/modals/Modal';
import { PromotionHistoryModal } from '@/components/modals/PromotionHistoryModal';
import { PromotionModal } from '@/components/modals/PromotionModal';
import { useTranslation } from '@/hooks/useTranslation';

type TranslationFn = ReturnType<typeof useTranslation>['t'];

function MyListingsSkeleton({ t }: { t: TranslationFn }) {
  return (
    <>
      <Breadcrumbs
        items={[{ label: t('myListings.home'), href: '/' }, { label: t('myListings.title') }]}
        className="mb-6"
      />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-primary-900">
          {t('myListings.title')}
        </h1>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-[48px] rounded-lg bg-primary-500/10 animate-pulse min-w-[140px] sm:min-w-[180px]"
            />
          ))}
        </div>
      </div>
      <div className="mb-6">
        <div className="flex flex-wrap gap-2 md:gap-3">
          <div className="h-9 md:h-10 w-14 rounded-lg bg-primary-500/10 animate-pulse" />
          <div className="h-9 md:h-10 w-20 rounded-lg bg-primary-500/10 animate-pulse" />
          <div className="h-9 md:h-10 w-20 rounded-lg bg-primary-500/10 animate-pulse" />
          <div className="h-9 md:h-10 w-20 rounded-lg bg-primary-500/10 animate-pulse" />
          <div className="h-9 md:h-10 w-24 rounded-lg bg-primary-500/10 animate-pulse" />
        </div>
      </div>
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <ListingManagementCardSkeleton key={i} />
        ))}
      </div>
    </>
  );
}

type ContentProps = ReturnType<typeof useMyListingsPage> & { t: TranslationFn };

function MyListingsModals({
  t,
  listings,
  isCloseConfirmOpen,
  setIsCloseConfirmOpen,
  listingToClose,
  setListingToClose,
  handleCloseConfirm,
  promotionModalOpen,
  setPromotionModalOpen,
  setSelectedListingId,
  handlePromotionSelect,
  promotionHistoryModalOpen,
  setPromotionHistoryModalOpen,
  promotionHistory,
  promotionHistoryMeta,
  promotionHistoryPage,
  loadingHistory,
  loadPromotionHistory,
}: Pick<
  ContentProps,
  | 't'
  | 'listings'
  | 'isCloseConfirmOpen'
  | 'setIsCloseConfirmOpen'
  | 'listingToClose'
  | 'setListingToClose'
  | 'handleCloseConfirm'
  | 'promotionModalOpen'
  | 'setPromotionModalOpen'
  | 'setSelectedListingId'
  | 'handlePromotionSelect'
  | 'promotionHistoryModalOpen'
  | 'setPromotionHistoryModalOpen'
  | 'promotionHistory'
  | 'promotionHistoryMeta'
  | 'promotionHistoryPage'
  | 'loadingHistory'
  | 'loadPromotionHistory'
>) {
  const listingToCloseEntity = listingToClose
    ? listings.find((l) => l.id === listingToClose)
    : null;
  const showPromotedWarnings = Boolean(listingToCloseEntity?.is_promoted);
  return (
    <>
      <Modal
        isOpen={isCloseConfirmOpen}
        onClose={() => {
          setIsCloseConfirmOpen(false);
          setListingToClose(null);
        }}
        title={t('myListings.closeConfirmTitle')}
        size="medium"
      >
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-base leading-relaxed text-text-secondary">
              {t('myListings.closeConfirmQuestion')}
            </p>
            <ol className="list-decimal list-inside space-y-2 text-base leading-relaxed text-text-secondary">
              <li>{t('myListings.closeConfirmWarning1')}</li>
              <li>{t('myListings.closeConfirmWarning2')}</li>
              {showPromotedWarnings && (
                <>
                  <li>{t('myListings.closeConfirmWarning3')}</li>
                  <li>{t('myListings.closeConfirmWarning4')}</li>
                </>
              )}
            </ol>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <button
              type="button"
              onClick={() => {
                setIsCloseConfirmOpen(false);
                setListingToClose(null);
              }}
              className="close-confirm-btn flex-1 min-h-[48px] h-12 shrink-0 flex items-center justify-center px-4 rounded-lg border-2 border-gray-500/40 hover:border-gray-500/60 bg-gray-500/20 text-text-secondary font-semibold text-base hover:text-text-primary transition-colors duration-200 select-none"
            >
              {t('myListings.closeConfirmCancel')}
            </button>
            <button
              type="button"
              onClick={handleCloseConfirm}
              className="close-confirm-btn flex-1 min-h-[48px] h-12 shrink-0 flex items-center justify-center px-4 rounded-lg border-2 border-primary-600 hover:border-primary-700 bg-primary-500/20 text-primary-800 font-semibold text-base hover:bg-primary-500/30 transition-colors duration-200 select-none"
            >
              {t('myListings.closeConfirmOk')}
            </button>
          </div>
        </div>
      </Modal>
      <PromotionModal
        isOpen={promotionModalOpen}
        onClose={() => {
          setPromotionModalOpen(false);
          setSelectedListingId(null);
        }}
        onSelect={handlePromotionSelect}
        isAdmin={false}
      />
      <PromotionHistoryModal
        isOpen={promotionHistoryModalOpen}
        onClose={() => setPromotionHistoryModalOpen(false)}
        history={promotionHistory}
        meta={promotionHistoryMeta}
        currentPage={promotionHistoryPage}
        loading={loadingHistory}
        onPageChange={loadPromotionHistory}
      />
    </>
  );
}

function MyListingsListSection({
  t,
  listings,
  allListingsForCount,
  statusFilter,
  statusCounts,
  promotedFilter,
  meta,
  currentPage,
  loadingMore,
  canPromote,
  handleStatusFilterChange,
  handlePromotedFilterToggle,
  handleAction,
  handleLoadMore,
  handlePromoteClick,
}: Pick<
  ContentProps,
  | 't'
  | 'listings'
  | 'allListingsForCount'
  | 'statusFilter'
  | 'statusCounts'
  | 'promotedFilter'
  | 'meta'
  | 'currentPage'
  | 'loadingMore'
  | 'canPromote'
  | 'handleStatusFilterChange'
  | 'handlePromotedFilterToggle'
  | 'handleAction'
  | 'handleLoadMore'
  | 'handlePromoteClick'
>) {
  const showFilters = allListingsForCount.length > 0 || listings.length > 0;
  const sourceForCount = allListingsForCount.length > 0 ? allListingsForCount : listings;
  const promotedCount = sourceForCount.filter((l) => l.is_promoted === true).length;
  const emptyMessage =
    statusFilter !== 'All' || promotedFilter !== 'All'
      ? t('myListings.noListingsWithStatus')
      : t('myListings.noListingsYet');
  const hasListings = listings.length > 0;
  const showLoadMore =
    Boolean(meta?.totalPages) && currentPage < (meta?.totalPages ?? 0) && !loadingMore;
  const showNoMore = Boolean(meta?.totalPages) && currentPage >= (meta?.totalPages ?? 0);

  return (
    <>
      {showFilters && (
        <div className="mb-6 pt-4 border-t border-primary-500/20 sm:border-t-0 sm:pt-0">
          <StatusFilterButtons
            currentFilter={statusFilter}
            onFilterChange={handleStatusFilterChange}
            counts={statusCounts}
            showPromoted={canPromote}
            promotedCount={promotedCount}
            promotedActive={promotedFilter === 'Promoted'}
            onPromotedClick={handlePromotedFilterToggle}
            translationPrefix="myListings"
          />
        </div>
      )}
      {!hasListings ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <>
          <div className="space-y-4">
            {listings.map((listing) => (
              <ListingManagementCard
                key={listing.id}
                listing={listing}
                mode="my-listings"
                onAction={handleAction}
                onPromoteClick={canPromote ? handlePromoteClick : undefined}
              />
            ))}
          </div>
          {loadingMore && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="mt-2" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
                {t('common.loading')}
              </p>
            </div>
          )}
          {showLoadMore && <LoadMoreButton onClick={handleLoadMore} />}
          {showNoMore && (
            <div className="text-center pt-8 pb-0">
              <p style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
                {t('myListings.noMoreListings')}
              </p>
            </div>
          )}
        </>
      )}
    </>
  );
}

function MyListingsContent(props: ContentProps) {
  const {
    t,
    user,
    listings,
    statusFilter,
    statusCounts,
    allListingsForCount,
    meta,
    currentPage,
    loadingMore,
    isRefreshing,
    timeUntilRefresh,
    formattedTime,
    hasActiveListings,
    canPromote,
    hasPromotionHistory,
    isCloseConfirmOpen,
    listingToClose,
    setIsCloseConfirmOpen,
    setListingToClose,
    promotionModalOpen,
    setPromotionModalOpen,
    setSelectedListingId,
    promotionHistoryModalOpen,
    setPromotionHistoryModalOpen,
    promotionHistory,
    promotionHistoryMeta,
    promotionHistoryPage,
    loadingHistory,
    loadPromotionHistory,
    handleStatusFilterChange,
    handlePromotedFilterToggle,
    handleAction,
    handleCloseConfirm,
    handleRefreshDates,
    handleLoadMore,
    handlePromoteClick,
    handlePromotionSelect,
    promotedFilter,
  } = props;
  const showBoardLink = Boolean(user?.boardSlug);
  const showPromotionHistory = listings.length > 0 && canPromote;
  const showCreateLink = listings.length === 0;
  return (
    <>
      <Breadcrumbs
        items={[{ label: t('myListings.home'), href: '/' }, { label: t('myListings.title') }]}
        className="mb-6"
      />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-primary-900">
          {t('myListings.title')}
        </h1>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <LoadMoreButton
            onClick={handleRefreshDates}
            disabled={
              isRefreshing ||
              (timeUntilRefresh !== null && timeUntilRefresh > 0) ||
              !hasActiveListings
            }
            variant="inline"
            className="w-full sm:w-auto"
          >
            {isRefreshing ? (
              <>
                <div className="w-3.5 h-3.5 md:w-4 md:h-4 border-2 border-primary-700 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                {t('myListings.refreshing')}
              </>
            ) : (
              <>
                <svg
                  className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {formattedTime ? (
                  <>{t('myListings.refreshDateWithTime', { time: formattedTime })}</>
                ) : (
                  t('myListings.refreshDate')
                )}
              </>
            )}
          </LoadMoreButton>
          {showBoardLink && user?.boardSlug && (
            <Link
              href={`/board/${user.boardSlug}`}
              className="w-full sm:w-auto h-[48px] text-primary-700 font-medium text-base hover:text-primary-900 transition-colors duration-200 whitespace-nowrap flex items-center justify-center gap-2 px-4 rounded-lg border-2 border-primary-700 hover:border-primary-900 bg-primary-500/10 select-none inline-block"
            >
              <svg
                className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              {t('myListings.myBoard')}
            </Link>
          )}
          {showPromotionHistory && (
            <LoadMoreButton
              onClick={() => {
                props.setPromotionHistoryModalOpen(true);
                void loadPromotionHistory(1);
              }}
              disabled={!hasPromotionHistory}
              variant="inline"
              className="w-full sm:w-auto"
            >
              <svg
                className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {t('myListings.promotionHistory')}
            </LoadMoreButton>
          )}
          {showCreateLink && (
            <Link
              href="/listings/new"
              className="w-full sm:w-auto h-[48px] text-primary-700 font-medium text-base hover:text-primary-900 transition-colors duration-200 whitespace-nowrap flex items-center justify-center gap-2 px-4 rounded-lg border-2 border-primary-700 hover:border-primary-900 bg-primary-500/10 select-none inline-block text-center"
            >
              <svg
                className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              {t('myListings.createListing')}
            </Link>
          )}
        </div>
      </div>

      <MyListingsListSection
        t={t}
        listings={listings}
        allListingsForCount={allListingsForCount}
        statusFilter={statusFilter}
        statusCounts={statusCounts}
        promotedFilter={promotedFilter}
        meta={meta}
        currentPage={currentPage}
        loadingMore={loadingMore}
        canPromote={canPromote}
        handleStatusFilterChange={handleStatusFilterChange}
        handlePromotedFilterToggle={handlePromotedFilterToggle}
        handleAction={handleAction}
        handleLoadMore={handleLoadMore}
        handlePromoteClick={handlePromoteClick}
      />

      <MyListingsModals
        t={t}
        listings={listings}
        isCloseConfirmOpen={isCloseConfirmOpen}
        setIsCloseConfirmOpen={setIsCloseConfirmOpen}
        listingToClose={listingToClose}
        setListingToClose={setListingToClose}
        handleCloseConfirm={handleCloseConfirm}
        promotionModalOpen={promotionModalOpen}
        setPromotionModalOpen={setPromotionModalOpen}
        setSelectedListingId={setSelectedListingId}
        handlePromotionSelect={handlePromotionSelect}
        promotionHistoryModalOpen={promotionHistoryModalOpen}
        setPromotionHistoryModalOpen={setPromotionHistoryModalOpen}
        promotionHistory={promotionHistory}
        promotionHistoryMeta={promotionHistoryMeta}
        promotionHistoryPage={promotionHistoryPage}
        loadingHistory={loadingHistory}
        loadPromotionHistory={loadPromotionHistory}
      />
    </>
  );
}

export default function MyListingsPage() {
  const { t } = useTranslation();
  const state = useMyListingsPage();
  const { isLoading, isAuthorized, showSkeleton } = state;

  if (isLoading || !isAuthorized) {
    return null;
  }

  return (
    <div className="min-h-[calc(100vh-200px)]">
      <div
        className={`transition-opacity duration-300 ${showSkeleton ? 'opacity-100' : 'opacity-0 hidden'}`}
      >
        <MyListingsSkeleton t={t} />
      </div>
      <div
        className={`transition-opacity duration-300 ${!showSkeleton ? 'opacity-100' : 'opacity-0 hidden'}`}
      >
        <MyListingsContent t={t} {...state} />
      </div>
    </div>
  );
}
