import {
  getOverlayHistoryStackSizeForTests,
  registerOverlayHistory,
  resetOverlayHistoryForTests,
  unregisterOverlayHistory,
} from './overlay-history';

describe('overlay-history', () => {
  const pushState = jest.fn();
  const back = jest.fn();

  beforeEach(() => {
    resetOverlayHistoryForTests();
    pushState.mockClear();
    back.mockClear();
    let historyState: Record<string, unknown> | null = null;
    pushState.mockImplementation((state: Record<string, unknown>) => {
      historyState = state;
    });
    Object.defineProperty(window, 'history', {
      configurable: true,
      value: {
        get state() {
          return historyState;
        },
        pushState,
        back,
      },
    });
  });

  afterEach(() => {
    resetOverlayHistoryForTests();
  });

  it('updates the close callback without a second pushState when the same id re-registers', () => {
    const closeA = jest.fn();
    const closeB = jest.fn();
    registerOverlayHistory('a', closeA);
    registerOverlayHistory('a', closeB);

    expect(pushState).toHaveBeenCalledTimes(1);
    expect(getOverlayHistoryStackSizeForTests()).toBe(1);
  });

  it('closes the middle overlay without history.back when it is not on top', () => {
    const closeA = jest.fn();
    const closeB = jest.fn();
    registerOverlayHistory('a', closeA);
    registerOverlayHistory('b', closeB);

    unregisterOverlayHistory('a', false);

    expect(closeA).not.toHaveBeenCalled();
    expect(back).not.toHaveBeenCalled();
    expect(getOverlayHistoryStackSizeForTests()).toBe(1);
  });
});
