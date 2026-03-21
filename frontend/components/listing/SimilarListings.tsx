'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { SkeletonContainer } from '@/components/SkeletonContainer';
import { ListingCard } from '@/components/listing/ListingCard';
import { ListingCardSkeleton } from '@/components/listing/ListingCardSkeleton';
import { useTranslation } from '@/hooks/useTranslation';
import { analytics } from '@/lib/analytics';
import type { Listing } from '@/lib/api';
import { listingsApi } from '@/lib/api';
import { useFavoritesStore } from '@/lib/store';

interface SimilarListingsProps {
  listingId: string;
}

interface SimilarListingCardProps {
  listing: Listing;
  position: number;
  listingId: string;
  onCardClick: (_clickedListingId: string, _position: number) => void;
}

function SimilarListingCard({
  listing,
  position,
  listingId,
  onCardClick,
}: SimilarListingCardProps) {
  const prevFavoriteState = useRef<boolean | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const { favorites } = useFavoritesStore();
  const isCurrentlyFavorite = favorites?.includes(listing.id) ?? false;

  useEffect(() => {
    if (prevFavoriteState.current !== null && prevFavoriteState.current !== isCurrentlyFavorite) {
      analytics.similarFavoriteToggle(
        listingId,
        listing.id,
        isCurrentlyFavorite ? 'add' : 'remove',
      );
    }
    prevFavoriteState.current = isCurrentlyFavorite;
  }, [isCurrentlyFavorite, listingId, listing.id]);

  useEffect(() => {
    const cardElement = cardRef.current;
    if (!cardElement) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('a[href^="/listings/"]')) {
        onCardClick(listing.id, position);
      }
    };

    cardElement.addEventListener('click', handleClick);
    return () => {
      cardElement.removeEventListener('click', handleClick);
    };
  }, [listing.id, position, onCardClick]);

  return (
    <div ref={cardRef} className="[&_.card]:bg-bg-darker h-full">
      <ListingCard listing={listing} linkPrefetch={true} />
    </div>
  );
}

export function SimilarListings({ listingId }: SimilarListingsProps) {
  const { t } = useTranslation();
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const hasTrackedImpression = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      listingsApi
        .getSimilar(listingId, 8, 0)
        .then((response) => {
          if (!controller.signal.aborted) {
            setListings(response.data || []);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsLoading(false);
          }
        });
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [listingId]);

  useEffect(() => {
    if (!sectionRef.current || hasTrackedImpression.current || listings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTrackedImpression.current) {
            hasTrackedImpression.current = true;
            analytics.similarBlockImpression(listingId, listings.length);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 },
    );

    observer.observe(sectionRef.current);

    return () => {
      observer.disconnect();
    };
  }, [listingId, listings.length]);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [currentPosition, setCurrentPosition] = useState(1);

  const updateScrollButtons = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollLeft(scrollLeft > 1);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);

    const cards = Array.from(container.querySelectorAll('[role="listitem"]')) as HTMLElement[];
    if (cards.length === 0) return;

    const cardWidth = cards[0].offsetWidth;
    const gap = 16;
    const cardWithGap = cardWidth + gap;
    const visibleCards = Math.floor(clientWidth / cardWithGap);
    const maxPositions = Math.max(1, listings.length - visibleCards + 1);
    setTotalPositions(maxPositions);

    const containerCenter = scrollLeft + clientWidth / 2;
    let closestCardIndex = 0;
    let minDistance = Infinity;

    cards.forEach((card, index) => {
      const cardLeft = card.offsetLeft;
      const cardRight = cardLeft + card.offsetWidth;
      const cardCenter = (cardLeft + cardRight) / 2;
      const distance = Math.abs(containerCenter - cardCenter);

      if (distance < minDistance) {
        minDistance = distance;
        closestCardIndex = index;
      }
    });

    const newPosition = Math.max(1, Math.min(closestCardIndex + 1, maxPositions));
    setCurrentPosition(newPosition);
  }, [listings.length]);

  const handleScrollLeft = useCallback(() => {
    const container = containerRef.current;
    if (!container || !canScrollLeft) return;

    const cards = Array.from(container.querySelectorAll('[role="listitem"]')) as HTMLElement[];
    if (cards.length === 0) return;

    const cardWidth = cards[0].offsetWidth;
    const gap = 16;
    const targetPosition = Math.max(1, currentPosition - 1);

    if (targetPosition === 1) {
      container.scrollTo({
        left: 0,
        behavior: 'smooth',
      });
    } else {
      container.scrollBy({
        left: -(cardWidth + gap),
        behavior: 'smooth',
      });
    }

    setTimeout(updateScrollButtons, 400);
  }, [canScrollLeft, updateScrollButtons, currentPosition]);

  const handleScrollRight = useCallback(() => {
    const container = containerRef.current;
    if (!container || !canScrollRight) return;

    const cards = Array.from(container.querySelectorAll('[role="listitem"]')) as HTMLElement[];
    if (cards.length === 0) return;

    const cardWidth = cards[0].offsetWidth;
    const gap = 16;
    const cardWithGap = cardWidth + gap;
    const visibleCards = Math.floor(container.clientWidth / cardWithGap);
    const maxPositions = Math.max(1, listings.length - visibleCards + 1);
    const targetPosition = Math.min(maxPositions, currentPosition + 1);

    if (targetPosition === maxPositions) {
      const maxScrollLeft = container.scrollWidth - container.clientWidth;
      container.scrollTo({
        left: maxScrollLeft,
        behavior: 'smooth',
      });
    } else {
      container.scrollBy({
        left: cardWidth + gap,
        behavior: 'smooth',
      });
    }

    setTimeout(updateScrollButtons, 400);
  }, [canScrollRight, updateScrollButtons, currentPosition, listings.length]);

  const handleCardClick = useCallback(
    (clickedListingId: string, position: number) => {
      analytics.similarCardClick(listingId, clickedListingId, position);
    },
    [listingId],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.scrollLeft = 0;
    setCurrentPosition(1);
  }, [listingId]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || isLoading) return;

    updateScrollButtons();
    container.addEventListener('scroll', updateScrollButtons);

    const resizeObserver = new ResizeObserver(() => {
      updateScrollButtons();
    });
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', updateScrollButtons);
      resizeObserver.disconnect();
    };
  }, [isLoading, updateScrollButtons]);

  useEffect(() => {
    if (!isLoading && listings.length > 0) {
      setTimeout(updateScrollButtons, 200);
    }
  }, [isLoading, listings.length, updateScrollButtons]);

  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const checkTouchDevice = () => {
      setIsTouchDevice(
        'ontouchstart' in window ||
          navigator.maxTouchPoints > 0 ||
          ((navigator as Navigator & { msMaxTouchPoints?: number }).msMaxTouchPoints ?? 0) > 0,
      );
    };

    checkTouchDevice();
    window.addEventListener('resize', checkTouchDevice);

    return () => {
      window.removeEventListener('resize', checkTouchDevice);
    };
  }, []);

  const [totalPositions, setTotalPositions] = useState(1);

  const showNavigation = listings.length > 1 && !isTouchDevice;

  if (!isLoading && listings.length === 0) {
    return null;
  }

  return (
    <section ref={sectionRef} aria-label={t('similarListings.title')} className="mt-6 md:mt-8">
      <div className="surface">
        <div className="flex items-center gap-4 mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-primary-900">
            {t('similarListings.title')}
          </h2>
          {showNavigation && (
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={handleScrollLeft}
                disabled={!canScrollLeft}
                className="bg-bg-darker/90 hover-only:hover:bg-bg-darker border-2 border-primary-700 hover-only:hover:border-primary-900 rounded-full p-2 transition-all shadow-lg backdrop-blur-xs disabled:opacity-50 disabled:cursor-not-allowed group"
                aria-label={t('similarListings.scrollLeft')}
              >
                <svg
                  className="w-5 h-5 text-primary-700 lg:group-hover:text-primary-900 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <div className="text-sm font-medium text-primary-700 min-w-12 text-center">
                {currentPosition}/{totalPositions}
              </div>
              <button
                type="button"
                onClick={handleScrollRight}
                disabled={!canScrollRight}
                className="bg-bg-darker/90 hover-only:hover:bg-bg-darker border-2 border-primary-700 hover-only:hover:border-primary-900 rounded-full p-2 transition-all shadow-lg backdrop-blur-xs disabled:opacity-50 disabled:cursor-not-allowed group"
                aria-label={t('similarListings.scrollRight')}
              >
                <svg
                  className="w-5 h-5 text-primary-700 lg:group-hover:text-primary-900 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
        <div className="overflow-hidden -mx-4 md:-mx-6">
          <div
            ref={containerRef}
            role="list"
            className="flex items-stretch overflow-x-auto gap-4 scroll-smooth [&::-webkit-scrollbar]:hidden px-4 md:px-6"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {isLoading ? (
              <SkeletonContainer isLoading={true} immediate={true} showDelay={0}>
                {Array(4)
                  .fill(null)
                  .map((_, i) => (
                    <div
                      key={`skeleton-${i}`}
                      role="listitem"
                      className="shrink-0 w-[250px] md:w-[260px] flex"
                    >
                      <div className="w-full h-full">
                        <ListingCardSkeleton />
                      </div>
                    </div>
                  ))}
              </SkeletonContainer>
            ) : (
              listings.map((listing, i) => (
                <div
                  key={listing.id}
                  role="listitem"
                  className="shrink-0 w-[250px] md:w-[260px] flex"
                >
                  <div className="w-full h-full">
                    <SimilarListingCard
                      listing={listing}
                      position={i + 1}
                      listingId={listingId}
                      onCardClick={handleCardClick}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
