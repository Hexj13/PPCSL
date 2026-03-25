import {
  createPreviewState,
  getConfirmedIndex,
  preparePendingPreviewState,
  promotePendingPreviewState,
} from './ListingPageImages';

describe('ListingPageImages preview state', () => {
  it('keeps a confirmed preview slot during repeated navigation to the fourth slide', () => {
    let state = createPreviewState(2);

    const toFourth = preparePendingPreviewState(state, 3);
    expect(getConfirmedIndex(toFourth.nextState)).toBe(2);
    expect(toFourth.nextState.pendingSlot).toBe(toFourth.pendingSlot);
    expect(toFourth.nextState.slotIndices[toFourth.pendingSlot]).toBe(3);

    state = promotePendingPreviewState(toFourth.nextState, toFourth.pendingSlot, 3);
    expect(getConfirmedIndex(state)).toBe(3);
    expect(state.pendingSlot).toBeNull();

    const backToThird = preparePendingPreviewState(state, 2);
    expect(getConfirmedIndex(backToThird.nextState)).toBe(3);
    expect(backToThird.nextState.slotIndices[backToThird.pendingSlot]).toBe(2);

    state = promotePendingPreviewState(backToThird.nextState, backToThird.pendingSlot, 2);
    expect(getConfirmedIndex(state)).toBe(2);
    expect(state.pendingSlot).toBeNull();

    const toFourthAgain = preparePendingPreviewState(state, 3);
    expect(getConfirmedIndex(toFourthAgain.nextState)).toBe(2);
    expect(toFourthAgain.nextState.slotIndices[toFourthAgain.pendingSlot]).toBe(3);
  });

  it('never leaves preview state without a confirmed slide', () => {
    const initialState = createPreviewState(0);
    const pendingState = preparePendingPreviewState(initialState, 3).nextState;
    const promotedState = promotePendingPreviewState(pendingState, 'secondary', 3);

    expect(getConfirmedIndex(initialState)).toBe(0);
    expect(getConfirmedIndex(pendingState)).toBe(0);
    expect(getConfirmedIndex(promotedState)).toBe(3);
  });
});
