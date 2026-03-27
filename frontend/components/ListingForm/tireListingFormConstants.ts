import {
  TIRE_ASPECT_RATIO_MAX,
  TIRE_LISTING_QUANTITY_MAX,
  TIRE_LISTING_QUANTITY_MIN,
  TIRE_WIDTH_MM_MAX,
} from '@/lib/constants';

export const TIRE_WIDTH_MM_INPUT_MAX_LEN = String(TIRE_WIDTH_MM_MAX).length;
export const TIRE_ASPECT_RATIO_INPUT_MAX_LEN = String(TIRE_ASPECT_RATIO_MAX).length;

export const TIRE_LISTING_QUANTITY_OPTS: readonly string[] = Array.from(
  { length: TIRE_LISTING_QUANTITY_MAX - TIRE_LISTING_QUANTITY_MIN + 1 },
  (_, i) => String(TIRE_LISTING_QUANTITY_MIN + i),
);

export const TIRE_LOAD_INDEX_MIN = 0;
export const TIRE_LOAD_INDEX_MAX = 279;

export const TIRE_SPEED_INDEX_OPTS = ['Q', 'R', 'S', 'T', 'H', 'V', 'W', 'Y'] as const;
