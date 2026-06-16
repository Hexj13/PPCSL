import {
  BOTTOM_SHEET_LOCK_MIN_HEIGHT_CAP_PX,
  BOTTOM_SHEET_MAX_HEIGHT_CAP_PX,
  computeBottomSheetLockMinHeightPx,
  computeBottomSheetMaxHeightPx,
} from './bottom-sheet-layout';

describe('bottom-sheet-layout', () => {
  it('computes max height from viewport ratio with cap', () => {
    expect(computeBottomSheetMaxHeightPx(800)).toBe(736);
    expect(computeBottomSheetMaxHeightPx(2000)).toBe(BOTTOM_SHEET_MAX_HEIGHT_CAP_PX);
  });

  it('computes lock min height from viewport ratio with cap', () => {
    expect(computeBottomSheetLockMinHeightPx(800)).toBe(704);
    expect(computeBottomSheetLockMinHeightPx(2000)).toBe(BOTTOM_SHEET_LOCK_MIN_HEIGHT_CAP_PX);
  });
});
