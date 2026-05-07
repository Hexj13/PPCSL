import {
  type PreviewState,
  getNavigationBaseIndex,
} from '@/components/ListingPage/ListingPageImages';

describe('getNavigationBaseIndex', () => {
  it('uses the pending target index while a navigation is in flight', () => {
    const snap: PreviewState = {
      confirmedSlot: 'primary',
      pendingSlot: 'secondary',
      slotIndices: { primary: 1, secondary: 4 },
    };
    expect(getNavigationBaseIndex(snap)).toBe(4);
  });

  it('computes next index from the pending target, not the stale confirmed slot', () => {
    const snap: PreviewState = {
      confirmedSlot: 'primary',
      pendingSlot: 'secondary',
      slotIndices: { primary: 1, secondary: 2 },
    };
    const total = 6;
    const next = (getNavigationBaseIndex(snap) + 1) % total;
    expect(next).toBe(3);
  });

  it('falls back to confirmed index when there is no pending navigation', () => {
    const snap: PreviewState = {
      confirmedSlot: 'primary',
      pendingSlot: null,
      slotIndices: { primary: 3, secondary: null },
    };
    expect(getNavigationBaseIndex(snap)).toBe(3);
  });
});
