export const LISTING_GRID_CARD_LAZY_ROOT_MARGIN_PX = 280;

export function listingGridCardSlotEntryIsIntersecting(entry: IntersectionObserverEntry): boolean {
  return entry.isIntersecting || entry.intersectionRatio > 0;
}

export function listingGridCardSlotIsNearViewport(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  const top = -LISTING_GRID_CARD_LAZY_ROOT_MARGIN_PX;
  const bottom = window.innerHeight + LISTING_GRID_CARD_LAZY_ROOT_MARGIN_PX;
  const left = -LISTING_GRID_CARD_LAZY_ROOT_MARGIN_PX;
  const right = window.innerWidth + LISTING_GRID_CARD_LAZY_ROOT_MARGIN_PX;
  return rect.top < bottom && rect.bottom > top && rect.left < right && rect.right > left;
}

export function listingGridCardSlotHasVisibleIntersection(
  element: Element,
  io: IntersectionObserver,
): boolean {
  const taker = io as IntersectionObserver & { takeRecords?: () => IntersectionObserverEntry[] };
  if (typeof taker.takeRecords === 'function') {
    const records = taker.takeRecords();
    if (records.some(listingGridCardSlotEntryIsIntersecting)) {
      return true;
    }
  }
  return listingGridCardSlotIsNearViewport(element);
}
