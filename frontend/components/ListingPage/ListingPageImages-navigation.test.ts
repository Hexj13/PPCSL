import {
  type PreviewState,
  createPreviewState,
  getConfirmedIndex,
  getNavigationBaseIndex,
  preparePendingPreviewState,
  promotePendingPreviewState,
} from '@/components/ListingPage/ListingPageImages';

describe('ListingPageImages navigation state', () => {
  it('uses the confirmed index when there is no pending slot', () => {
    const state = createPreviewState(2);

    expect(getConfirmedIndex(state)).toBe(2);
    expect(getNavigationBaseIndex(state)).toBe(2);
  });

  it('uses the pending index as the base for sequential navigation', () => {
    const state = createPreviewState(2);
    const { nextState } = preparePendingPreviewState(state, 3);

    expect(getConfirmedIndex(nextState)).toBe(2);
    expect(getNavigationBaseIndex(nextState)).toBe(3);
  });

  it('promotes only the matching pending slot and target index', () => {
    const state = createPreviewState(2);
    const { pendingSlot, nextState } = preparePendingPreviewState(state, 3);

    expect(promotePendingPreviewState(nextState, pendingSlot, 4)).toBe(nextState);
    expect(getConfirmedIndex(promotePendingPreviewState(nextState, pendingSlot, 3))).toBe(3);
  });
});

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
