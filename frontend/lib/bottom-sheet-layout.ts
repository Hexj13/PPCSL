export const BOTTOM_SHEET_TRANSITION_MS = 300;

export const BOTTOM_SHEET_TRANSITION_FALLBACK_MS = 380;

export function getBottomSheetSlideStyle(visible: boolean): {
  transform: 'translateY(0%)' | 'translateY(100%)';
  transitionDuration: string;
} {
  return {
    transform: visible ? 'translateY(0%)' : 'translateY(100%)',
    transitionDuration: `${BOTTOM_SHEET_TRANSITION_MS}ms`,
  };
}

export const BOTTOM_SHEET_MAX_HEIGHT_CAP_PX = 900;

export const BOTTOM_SHEET_LOCK_MIN_HEIGHT_CAP_PX = 860;

export const BOTTOM_SHEET_MAX_HEIGHT_RATIO = 0.92;

export const BOTTOM_SHEET_LOCK_MIN_HEIGHT_RATIO = 0.88;

export const BOTTOM_SHEET_LIST_SCROLL_CLASS =
  'min-h-0 flex-1 overflow-y-auto overscroll-y-contain scrollbar-custom';

export function computeBottomSheetMaxHeightPx(viewportHeightPx: number): number {
  return Math.min(
    Math.round(viewportHeightPx * BOTTOM_SHEET_MAX_HEIGHT_RATIO),
    BOTTOM_SHEET_MAX_HEIGHT_CAP_PX,
  );
}

export function computeBottomSheetLockMinHeightPx(viewportHeightPx: number): number {
  return Math.min(
    Math.round(viewportHeightPx * BOTTOM_SHEET_LOCK_MIN_HEIGHT_RATIO),
    BOTTOM_SHEET_LOCK_MIN_HEIGHT_CAP_PX,
  );
}
