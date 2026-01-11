'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { ListingCard } from '@/components/ListingCard';
import { ListingCardSkeleton } from '@/components/ListingCardSkeleton';
import { SkeletonContainer } from '@/components/SkeletonContainer';
import { useTranslation } from '@/hooks/useTranslation';
import { analytics } from '@/lib/analytics';
import { listingsApi, Listing } from '@/lib/api';
import { useFavoritesStore } from '@/lib/store';

interface SimilarListingsProps {
  listingId: string;
  currentCity?: string;
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
        isCurrentlyFavorite ? 'add' : 'remove'
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
  }, [listing.id, position, listingId, onCardClick]);

  return (
    <div ref={cardRef} className="[&_.card]:bg-bg-darker">
      <ListingCard listing={listing} />
    </div>
  );
}

export function SimilarListings({ listingId }: SimilarListingsProps) {
  const { t } = useTranslation();
  const [loadedListings, setLoadedListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasLoadedFirst, setHasLoadedFirst] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const hasTrackedImpression = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      listingsApi
        .getSimilar(listingId, 5, 0)
        .then((response) => {
          if (!controller.signal.aborted) {
            const data = response.data || [];
            setLoadedListings(data);
            setMaxLoaded(Math.max(data.length, 8));
            setHasLoadedFirst(true);
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setHasLoadedFirst(true);
          }
        })
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
    if (!sectionRef.current || hasTrackedImpression.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTrackedImpression.current) {
            hasTrackedImpression.current = true;
            analytics.similarBlockImpression(listingId, loadedListings.length);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(sectionRef.current);

    return () => {
      observer.disconnect();
    };
  }, [listingId, loadedListings.length]);

  const loadNextListing = useCallback(() => {
    if (isLoadingMore) return;

    const currentCount = loadedListings.length;
    setIsLoadingMore(true);
    listingsApi
      .getSimilar(listingId, 1, currentCount)
      .then((response) => {
        if (response.data && response.data.length > 0) {
          setLoadedListings((prev) => [...prev, ...response.data]);
          setMaxLoaded((prev) => prev + 1);
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsLoadingMore(false);
      });
  }, [listingId, loadedListings.length, isLoadingMore]);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [currentPosition, setCurrentPosition] = useState(1);
  const [maxLoaded, setMaxLoaded] = useState(5);

  const updateScrollButtons = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    const isAtStart = scrollLeft <= 1;
    const isAtEnd = scrollLeft + clientWidth >= scrollWidth - 1;
    const hasMoreToLoad = loadedListings.length < maxLoaded && !isLoadingMore;

    setCanScrollLeft(!isAtStart);
    setCanScrollRight(!isAtEnd || hasMoreToLoad);
  }, [loadedListings.length, maxLoaded, isLoadingMore]);

  const handleScrollLeft = useCallback(() => {
    const container = containerRef.current;
    if (!container || !canScrollLeft) return;

    const cards = Array.from(container.querySelectorAll('[role="listitem"]')) as HTMLElement[];
    if (cards.length === 0) return;

    const cardWidth = cards[0].offsetWidth;
    const gap = 16;

    container.scrollBy({
      left: -(cardWidth + gap),
      behavior: 'smooth',
    });

    setCurrentPosition((prev) => Math.max(1, prev - 1));

    setTimeout(() => {
      updateScrollButtons();
    }, 600);
  }, [canScrollLeft, updateScrollButtons]);

  const handleScrollRight = useCallback(() => {
    const container = containerRef.current;
    if (!container || !canScrollRight) return;

    const cards = Array.from(container.querySelectorAll('[role="listitem"]')) as HTMLElement[];
    if (cards.length === 0) return;

    const cardWidth = cards[0].offsetWidth;
    const gap = 16;

    const currentScroll = container.scrollLeft;
    const maxScroll = container.scrollWidth - container.clientWidth;
    const willReachEnd = currentScroll + cardWidth + gap >= maxScroll - 50;

    if (willReachEnd && !isLoadingMore && loadedListings.length < maxLoaded) {
      loadNextListing();
      analytics.similarScroll(listingId);

      setTimeout(() => {
        container.scrollBy({
          left: cardWidth + gap,
          behavior: 'smooth',
        });
        setCurrentPosition((prev) => Math.min(prev + 1, 4));
        updateScrollButtons();
      }, 100);
    } else {
      container.scrollBy({
        left: cardWidth + gap,
        behavior: 'smooth',
      });

      setCurrentPosition((prev) => Math.min(prev + 1, 4));

      setTimeout(() => {
        updateScrollButtons();
      }, 600);
    }
  }, [
    canScrollRight,
    isLoadingMore,
    loadNextListing,
    listingId,
    updateScrollButtons,
    loadedListings.length,
    maxLoaded,
  ]);

  const handleCardClick = useCallback(
    (clickedListingId: string, position: number) => {
      analytics.similarCardClick(listingId, clickedListingId, position);
    },
    [listingId]
  );

  const handleScrollEvent = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollLeft, scrollWidth, clientWidth } = e.currentTarget;
      const scrollPercentage = (scrollLeft + clientWidth) / scrollWidth;

      if (scrollPercentage > 0.8 && !isLoadingMore) {
        loadNextListing();
      }
    },
    [isLoadingMore, loadNextListing]
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

    const resizeObserver = new ResizeObserver(updateScrollButtons);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', updateScrollButtons);
      resizeObserver.disconnect();
    };
  }, [isLoading, updateScrollButtons]);

  useEffect(() => {
    if (!isLoading && loadedListings.length > 0) {
      setTimeout(updateScrollButtons, 200);
    }
  }, [isLoading, loadedListings.length, updateScrollButtons]);

  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const checkTouchDevice = () => {
      setIsTouchDevice(
        'ontouchstart' in window ||
          navigator.maxTouchPoints > 0 ||
          (navigator as Navigator & { msMaxTouchPoints?: number }).msMaxTouchPoints > 0
      );
    };

    checkTouchDevice();
    window.addEventListener('resize', checkTouchDevice);

    return () => {
      window.removeEventListener('resize', checkTouchDevice);
    };
  }, []);

  const totalPositions = Math.min(4, maxLoaded);
  const showButton = loadedListings.length > 0 && !isTouchDevice;

  if (hasLoadedFirst && !isLoading && loadedListings.length === 0) {
    return null;
  }

  return (
    <section
      ref={sectionRef}
      role="region"
      aria-label={t('similarListings.title')}
      className="mt-6 md:mt-8"
    >
      <div className="surface">
        <div className="flex items-center gap-4 mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-primary-400">
            {t('similarListings.title')}
          </h2>
          {showButton && (
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={handleScrollLeft}
                disabled={!canScrollLeft}
                className="bg-bg-darker/90 hover:bg-bg-darker border-2 border-primary-500/50 hover:border-primary-400 rounded-full p-2 transition-all shadow-lg backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={t('similarListings.scrollLeft')}
              >
                <svg
                  className="w-5 h-5 text-primary-400"
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
              <div className="text-sm font-medium text-primary-400 min-w-[3rem] text-center">
                {currentPosition}/{totalPositions}
              </div>
              <button
                type="button"
                onClick={handleScrollRight}
                disabled={!canScrollRight}
                className="bg-bg-darker/90 hover:bg-bg-darker border-2 border-primary-500/50 hover:border-primary-400 rounded-full p-2 transition-all shadow-lg backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={t('similarListings.scrollRight')}
              >
                <svg
                  className="w-5 h-5 text-primary-400"
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
            className="flex overflow-x-auto gap-4 scroll-smooth [&::-webkit-scrollbar]:hidden px-4 md:px-6"
            onScroll={handleScrollEvent}
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {isLoading ? (
              <SkeletonContainer isLoading={true} immediate={true} showDelay={0}>
                {Array(5)
                  .fill(null)
                  .map((_, i) => (
                    <div
                      key={`skeleton-${i}`}
                      role="listitem"
                      className="flex-shrink-0 w-[250px] md:w-[260px]"
                    >
                      <ListingCardSkeleton />
                    </div>
                  ))}
              </SkeletonContainer>
            ) : (
              <>
                {loadedListings.map((listing, i) => (
                  <div
                    key={listing.id}
                    role="listitem"
                    className="flex-shrink-0 w-[250px] md:w-[260px]"
                  >
                    <SimilarListingCard
                      listing={listing}
                      position={i + 1}
                      listingId={listingId}
                      onCardClick={handleCardClick}
                    />
                  </div>
                ))}
                {isLoadingMore && (
                  <div role="listitem" className="flex-shrink-0 w-[250px] md:w-[260px]">
                    <ListingCardSkeleton />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
