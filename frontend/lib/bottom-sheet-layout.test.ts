import {
  BOTTOM_SHEET_LOCK_MIN_HEIGHT_CAP_PX,
  BOTTOM_SHEET_MAX_HEIGHT_CAP_PX,
  computeBottomSheetLockMinHeightPx,
  computeBottomSheetMaxHeightPx,
  getBottomSheetSlideStyle,
} from './bottom-sheet-layout';

describe('bottom-sheet-layout', () => {
  it('computes max height from viewport ratio with cap', () => {
    expect(computeBottomSheetMaxHeightPx(800)).toBe(736);
    expect(computeBottomSheetMaxHeightPx(2000)).toBe(BOTTOM_SHEET_MAX_HEIGHT_CAP_PX);
  });

  it('uses the same enter and exit slide transforms as BottomSheet panels', () => {
    expect(getBottomSheetSlideStyle(false)).toEqual({
      transform: 'translateY(100%)',
      transitionDuration: '300ms',
    });
    expect(getBottomSheetSlideStyle(true)).toEqual({
      transform: 'translateY(0%)',
      transitionDuration: '300ms',
    });
  });

  it('computes lock min height from viewport ratio with cap', () => {
    expect(computeBottomSheetLockMinHeightPx(800)).toBe(704);
    expect(computeBottomSheetLockMinHeightPx(2000)).toBe(BOTTOM_SHEET_LOCK_MIN_HEIGHT_CAP_PX);
  });
});
