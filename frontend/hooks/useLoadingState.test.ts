import { act, render, renderHook } from '@testing-library/react';
import React from 'react';

import { useLoadingState } from './useLoadingState';

jest.useFakeTimers();

describe('useLoadingState', () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
  });

  describe('showDelay', () => {
    it('should not show indicator if loading completes before showDelay', () => {
      const { result, rerender } = renderHook(
        ({ isLoading }) => useLoadingState({ isLoading, showDelay: 200 }),
        { initialProps: { isLoading: false } },
      );

      expect(result.current.visible).toBe(false);

      rerender({ isLoading: true });

      expect(result.current.visible).toBe(false);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(result.current.visible).toBe(false);

      rerender({ isLoading: false });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(result.current.visible).toBe(false);
    });

    it('should show indicator after showDelay', () => {
      const { result, rerender } = renderHook(
        ({ isLoading }) => useLoadingState({ isLoading, showDelay: 200 }),
        { initialProps: { isLoading: false } },
      );

      rerender({ isLoading: true });

      expect(result.current.visible).toBe(false);

      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(result.current.visible).toBe(true);
    });
  });

  describe('minDisplayTime', () => {
    it('should keep indicator visible for minimum minDisplayTime', () => {
      const { result, rerender } = renderHook(
        ({ isLoading }) => useLoadingState({ isLoading, showDelay: 0, minDisplayTime: 1000 }),
        { initialProps: { isLoading: false } },
      );

      rerender({ isLoading: true });

      act(() => {
        jest.advanceTimersByTime(1);
      });

      expect(result.current.visible).toBe(true);

      rerender({ isLoading: false });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current.visible).toBe(true);

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current.visible).toBe(false);
    });

    it('should hide indicator immediately if minDisplayTime has already passed', () => {
      const { result, rerender } = renderHook(
        ({ isLoading }) => useLoadingState({ isLoading, showDelay: 0, minDisplayTime: 1000 }),
        { initialProps: { isLoading: false } },
      );

      rerender({ isLoading: true });

      act(() => {
        jest.advanceTimersByTime(1);
      });

      expect(result.current.visible).toBe(true);

      act(() => {
        jest.advanceTimersByTime(1500);
      });

      rerender({ isLoading: false });

      act(() => {
        jest.advanceTimersByTime(1);
      });

      expect(result.current.visible).toBe(false);
    });
  });

  describe('immediate', () => {
    it('should show indicator immediately when immediate=true', () => {
      const { result, rerender } = renderHook(
        ({ isLoading }) => useLoadingState({ isLoading, immediate: true, showDelay: 200 }),
        { initialProps: { isLoading: false } },
      );

      rerender({ isLoading: true });

      expect(result.current.visible).toBe(true);
    });

    it('sets visible during the isLoading render when immediate is true', () => {
      const visibles: boolean[] = [];

      function Probe({ isLoading }: { isLoading: boolean }) {
        const { visible } = useLoadingState({
          isLoading,
          immediate: true,
          showDelay: 200,
          minDisplayTime: 500,
        });
        visibles.push(visible);
        return null;
      }

      const { rerender } = render(React.createElement(Probe, { isLoading: false }));
      rerender(React.createElement(Probe, { isLoading: true }));

      expect(visibles[visibles.length - 1]).toBe(true);
    });
  });

  describe('afterHidden callback', () => {
    it('should call callback after indicator is hidden', () => {
      const callback = jest.fn();
      const { result, rerender } = renderHook(
        ({ isLoading }) => useLoadingState({ isLoading, showDelay: 0, minDisplayTime: 1000 }),
        { initialProps: { isLoading: false } },
      );

      rerender({ isLoading: true });

      act(() => {
        jest.advanceTimersByTime(1);
      });

      result.current.afterHidden(callback);

      expect(callback).not.toHaveBeenCalled();

      rerender({ isLoading: false });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanup', () => {
    it('should properly cleanup timers on unmount', () => {
      const { unmount, rerender } = renderHook(
        ({ isLoading }) => useLoadingState({ isLoading, showDelay: 200, minDisplayTime: 1000 }),
        { initialProps: { isLoading: false } },
      );

      rerender({ isLoading: true });

      act(() => {
        jest.advanceTimersByTime(200);
      });

      unmount();

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(jest.getTimerCount()).toBe(0);
    });
  });
});
