'use client';

import type { ReactNode } from 'react';

import { ListingPageActionCard } from '@/components/ListingPage/ListingPageActionCard';
import {
  getListingActionGridClass,
  getListingActionItemWrapperClass,
} from '@/components/ListingPage/listingPageActionLayout';
import { FileAiIcon } from '@/components/common/FileAiIcon';
import { useTranslation } from '@/hooks/useTranslation';
import type { Listing, PromotionAccessStatus } from '@/lib/api';

type Translate = (key: string) => string;

function promoteActionCopy(promoteCardIsInformational: boolean, t: Translate) {
  if (promoteCardIsInformational) {
    return {
      title: t('listingDetail.actionCardPromoteTitleWhenPromoted'),
      description: t('listingDetail.actionCardPromoteDescriptionWhenPromoted'),
    };
  }
  return {
    title: t('listings.promote'),
    description: t('listingDetail.actionCardPromoteDescription'),
  };
}

function favoriteActionCopy(isOwnListing: boolean, isFavorite: boolean, t: Translate) {
  if (isOwnListing) {
    return {
      title: t('listingDetail.yourListing'),
      description: t('listingDetail.actionCardFavoriteDescription'),
    };
  }
  if (isFavorite) {
    return {
      title: t('listingDetail.actionCardFavoriteTitleWhenSaved'),
      description: t('listingDetail.actionCardFavoriteDescriptionWhenSaved'),
    };
  }
  return {
    title: t('listingDetail.addToFavorites'),
    description: t('listingDetail.actionCardFavoriteDescription'),
  };
}

function compareActionCopy(isInComparison: boolean, t: Translate) {
  if (isInComparison) {
    return {
      title: t('listingDetail.actionCardCompareTitleWhenInComparison'),
      description: t('listingDetail.actionCardCompareDescriptionWhenInComparison'),
    };
  }
  return {
    title: t('listingDetail.compare'),
    description: t('listingDetail.actionCardCompareDescription'),
  };
}

function listingPagePromoteDiscoverable(access: PromotionAccessStatus | null | undefined): boolean {
  if (!access?.enabled) return false;
  if (access.access === 'all') return true;
  if (access.access === 'admin') return access.isAdmin;
  return false;
}

function PromoteIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
      />
    </svg>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className="h-5 w-5"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
      />
    </svg>
  );
}

function CompareIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className="h-5 w-5"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
      />
    </svg>
  );
}

interface ListingPageActionsProps {
  listing: Listing;
  isInitialized: boolean;
  isInComparison: boolean;
  isFavorite: boolean;
  isOwnListing: boolean;
  showCompare?: boolean;
  onAiReportClick?: () => void;
  onToggleComparison: () => void;
  onToggleFavorite: () => void;
  onPromoteClick: () => void;
  promotionAccess: PromotionAccessStatus | null;
}

function ListingPageActionsSecondRow(props: {
  secondRowHasContent: boolean;
  aiBlock: ReactNode;
  compareBlock: ReactNode;
  hasCompare: boolean;
  cellClass: string;
}) {
  const { secondRowHasContent, aiBlock, compareBlock, hasCompare, cellClass } = props;
  if (!secondRowHasContent) return null;
  return (
    <div className={getListingActionGridClass()}>
      {aiBlock && hasCompare && compareBlock ? (
        <>
          <div className={cellClass}>{aiBlock}</div>
          <div className={cellClass}>{compareBlock}</div>
        </>
      ) : aiBlock ? (
        <div className="col-span-2 w-full min-w-0">{aiBlock}</div>
      ) : (
        <div className="col-span-2 w-full min-w-0">{compareBlock}</div>
      )}
    </div>
  );
}

export function ListingPageActions({
  listing,
  isInitialized,
  isInComparison,
  isFavorite,
  isOwnListing,
  showCompare = true,
  onAiReportClick,
  onToggleComparison,
  onToggleFavorite,
  onPromoteClick,
  promotionAccess,
}: ListingPageActionsProps) {
  const { t } = useTranslation();

  const hasAi = Boolean(onAiReportClick);
  const hasCompare = listing.status !== 'Closed' && showCompare;
  const showPromoteCard =
    listingPagePromoteDiscoverable(promotionAccess) &&
    listing.status === 'Active' &&
    (!listing.is_promoted || isOwnListing);
  const promoteCardIsInformational = isOwnListing && Boolean(listing.is_promoted);

  const { title: promoteTitle, description: promoteDescription } = promoteActionCopy(
    promoteCardIsInformational,
    t,
  );
  const { title: favoriteTitle, description: favoriteDescription } = favoriteActionCopy(
    isOwnListing,
    isFavorite,
    t,
  );
  const { title: compareTitle, description: compareDescription } = compareActionCopy(
    isInComparison,
    t,
  );

  const showAiNewBadge = hasAi;
  const pageActionsLocked = !isInitialized;

  const favoriteCard = (
    <ListingPageActionCard
      variant="default"
      onClick={onToggleFavorite}
      disabled={pageActionsLocked}
      title={favoriteTitle}
      description={favoriteDescription}
      aria-label={favoriteTitle}
    >
      <HeartIcon filled={isFavorite} />
    </ListingPageActionCard>
  );

  const compareBlock = hasCompare && (
    <ListingPageActionCard
      variant="default"
      onClick={onToggleComparison}
      disabled={pageActionsLocked}
      title={compareTitle}
      description={compareDescription}
      aria-label={compareTitle}
    >
      <CompareIcon filled={isInComparison} />
    </ListingPageActionCard>
  );

  const aiBlock = hasAi && onAiReportClick && (
    <ListingPageActionCard
      variant="accent"
      onClick={onAiReportClick}
      disabled={pageActionsLocked}
      showNewBadge={showAiNewBadge}
      title={t('listingDetail.aiReport')}
      description={t('listingDetail.actionCardAiDescription')}
      titleId="listing-action-ai-title"
      aria-label={t('listingDetail.aiReport')}
    >
      <FileAiIcon className="h-5 w-5 shrink-0" />
    </ListingPageActionCard>
  );

  const promoteBlock = showPromoteCard && (
    <ListingPageActionCard
      variant="cta"
      onClick={onPromoteClick}
      disabled={pageActionsLocked}
      nonInteractive={promoteCardIsInformational}
      title={promoteTitle}
      description={promoteDescription}
      aria-label={promoteTitle}
    >
      <PromoteIcon />
    </ListingPageActionCard>
  );

  const hasPromote = Boolean(showPromoteCard && promoteBlock);
  const cellClass = getListingActionItemWrapperClass();
  const secondRowHasContent = Boolean(aiBlock || (hasCompare && compareBlock));

  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      {hasPromote ? (
        <div className={getListingActionGridClass()}>
          <div className={cellClass}>{promoteBlock}</div>
          <div className={cellClass}>{favoriteCard}</div>
        </div>
      ) : (
        <div className={getListingActionGridClass()}>
          <div className="col-span-2 w-full min-w-0">{favoriteCard}</div>
        </div>
      )}
      <ListingPageActionsSecondRow
        secondRowHasContent={secondRowHasContent}
        aiBlock={aiBlock}
        compareBlock={compareBlock}
        hasCompare={hasCompare}
        cellClass={cellClass}
      />
    </div>
  );
}
