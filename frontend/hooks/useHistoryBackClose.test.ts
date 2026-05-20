import { renderHook, act } from '@testing-library/react';

import {
  getOverlayHistoryStackSizeForTests,
  resetOverlayHistoryForTests,
  triggerOverlayPopStateForTests,
} from '@/lib/overlay-history';

import { useHistoryBackClose } from './useHistoryBackClose';

type OverlayHistoryState = Record<string, unknown> & {
  kupitoOverlay?: string;
};

describe('useHistoryBackClose', () => {
  const pushState = jest.fn();
  const back = jest.fn();

  beforeEach(() => {
    resetOverlayHistoryForTests();
    pushState.mockClear();
    back.mockClear();
    let historyState: OverlayHistoryState | null = null;
    pushState.mockImplementation((state: OverlayHistoryState) => {
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
    jest.restoreAllMocks();
  });

  it('pushes a history entry when the overlay opens', () => {
    const onClose = jest.fn();
    const { unmount } = renderHook(() => useHistoryBackClose(true, onClose, 'overlay-a'));

    expect(pushState).toHaveBeenCalledWith(
      expect.objectContaining({ kupitoOverlay: 'overlay-a' }),
      '',
    );
    expect(getOverlayHistoryStackSizeForTests()).toBe(1);

    unmount();
  });

  it('calls onClose when the user navigates back in history', () => {
    const onClose = jest.fn();
    renderHook(() => useHistoryBackClose(true, onClose, 'overlay-a'));

    act(() => {
      triggerOverlayPopStateForTests();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(back).not.toHaveBeenCalled();
    expect(getOverlayHistoryStackSizeForTests()).toBe(0);
  });

  it('removes the history entry when the overlay closes programmatically', () => {
    const onClose = jest.fn();
    const { rerender, unmount } = renderHook(
      ({ open }) => useHistoryBackClose(open, onClose, 'overlay-a'),
      { initialProps: { open: true } },
    );

    rerender({ open: false });
    unmount();

    expect(back).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(getOverlayHistoryStackSizeForTests()).toBe(0);
  });

  it('closes only the top overlay when multiple overlays are open', () => {
    const onCloseA = jest.fn();
    const onCloseB = jest.fn();

    const { unmount: unmountA } = renderHook(() =>
      useHistoryBackClose(true, onCloseA, 'overlay-a'),
    );
    const { unmount: unmountB } = renderHook(() =>
      useHistoryBackClose(true, onCloseB, 'overlay-b'),
    );

    expect(getOverlayHistoryStackSizeForTests()).toBe(2);

    act(() => {
      triggerOverlayPopStateForTests();
    });

    expect(onCloseB).toHaveBeenCalledTimes(1);
    expect(onCloseA).not.toHaveBeenCalled();
    expect(getOverlayHistoryStackSizeForTests()).toBe(1);

    unmountB();
    unmountA();
  });
});
