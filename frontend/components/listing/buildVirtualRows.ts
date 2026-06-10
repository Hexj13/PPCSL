import type { Listing } from '@/lib/api';

export type VirtualCardItem = {
  listing: Listing;
  index: number;
};

export type VirtualRow =
  | { kind: 'cards'; items: VirtualCardItem[] }
  | { kind: 'banner'; variant: 'mobile' | 'lg' | 'xl' };

export type BuildVirtualRowsResult = {
  rows: VirtualRow[];
  listingRowIndexById: Map<string, number>;
};

type BannerInsertion = { position: number; variant: 'mobile' | 'lg' | 'xl' };

function getBannerInsertion(columns: number): BannerInsertion {
  if (columns >= 4) {
    return { position: 12, variant: 'xl' };
  }
  if (columns === 3) {
    return { position: 9, variant: 'lg' };
  }
  return { position: 6, variant: 'mobile' };
}

export function buildVirtualRows(
  listings: Listing[],
  columns: number,
  options: { showPartnerPromoBanner: boolean },
): BuildVirtualRowsResult {
  const rows: VirtualRow[] = [];
  const listingRowIndexById = new Map<string, number>();
  let pendingCards: VirtualCardItem[] = [];
  const columnCount = Math.max(1, columns);

  const flushCards = () => {
    if (pendingCards.length === 0) {
      return;
    }
    const rowIndex = rows.length;
    for (const item of pendingCards) {
      listingRowIndexById.set(item.listing.id, rowIndex);
    }
    rows.push({ kind: 'cards', items: pendingCards });
    pendingCards = [];
  };

  const pushBanner = (variant: 'mobile' | 'lg' | 'xl') => {
    flushCards();
    rows.push({ kind: 'banner', variant });
  };

  const bannerInsertion = options.showPartnerPromoBanner ? getBannerInsertion(columnCount) : null;

  for (let index = 0; index < listings.length; index++) {
    const listing = listings[index];
    pendingCards.push({ listing, index });
    const cardPosition = index + 1;

    if (pendingCards.length === columnCount) {
      flushCards();
    }

    if (bannerInsertion && cardPosition === bannerInsertion.position) {
      pushBanner(bannerInsertion.variant);
    }
  }

  flushCards();

  return { rows, listingRowIndexById };
}

export function getVirtualRowEstimateSize(row: VirtualRow, columns = 1): number {
  if (row.kind === 'banner') {
    return 320;
  }
  return columns === 1 ? 500 : 570;
}

export function getBannerVariantClassName(variant: 'mobile' | 'lg' | 'xl'): string {
  switch (variant) {
    case 'mobile':
      return 'lg:hidden';
    case 'lg':
      return 'hidden lg:block xl:hidden';
    case 'xl':
      return 'hidden xl:block';
  }
}
