'use client';

import { useEffect, useState, useRef } from 'react';

import type { Listing } from '@/lib/api';

import { ListingCard } from './ListingCard';
import { ListingCardSkeleton } from './ListingCardSkeleton';
import {
  LISTING_CARD_ANCHOR_ATTR,
  LISTING_GRID_CARD_LAZY_ROOT_MARGIN_PX,
  listingGridCardSlotEntryIsIntersecting,
  listingGridCardSlotHasVisibleIntersection,
} from './listing-grid-lazy-card-slot';

const LISTING_GRID_LINK_PREFETCH_COUNT = 4;

export function ListingGridCardSlot({ listing, index }: { listing: Listing; index: number }) {
  const [mounted, setMounted] = useState(index < 8);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mounted) return;
    if (index < 8) {
      setMounted(true);
      return;
    }
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setMounted(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some(listingGridCardSlotEntryIsIntersecting)) {
          setMounted(true);
        }
      },
      { rootMargin: `${LISTING_GRID_CARD_LAZY_ROOT_MARGIN_PX}px`, threshold: 0.01 },
    );
    const tryMountFromSync = (): boolean => {
      const node = wrapRef.current;
      if (!node) return false;
      if (listingGridCardSlotHasVisibleIntersection(node, io)) {
        setMounted(true);
        return true;
      }
      return false;
    };
    io.observe(el);
    if (tryMountFromSync()) {
      return () => io.disconnect();
    }
    let raf2Id = 0;
    const raf1Id = requestAnimationFrame(() => {
      if (tryMountFromSync()) return;
      raf2Id = requestAnimationFrame(() => {
        raf2Id = 0;
        tryMountFromSync();
      });
    });
    return () => {
      cancelAnimationFrame(raf1Id);
      if (raf2Id !== 0) {
        cancelAnimationFrame(raf2Id);
      }
      io.disconnect();
    };
  }, [mounted, index]);

  const anchorProps = { [LISTING_CARD_ANCHOR_ATTR]: listing.id };

  if (!mounted) {
    return <ListingCardSkeleton ref={wrapRef} {...anchorProps} />;
  }

  return (
    <ListingCard
      listing={listing}
      priority={index < 6}
      linkPrefetch={index < LISTING_GRID_LINK_PREFETCH_COUNT}
    />
  );
}
