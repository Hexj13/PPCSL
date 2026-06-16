import { act, renderHook } from '@testing-library/react';

import { useCategorySwitchLock } from './useCategorySwitchLock';

describe('useCategorySwitchLock', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('runs action once and unlocks after animation delay', () => {
    const action = jest.fn();
    const { result } = renderHook(() => useCategorySwitchLock());

    act(() => {
      result.current.withCategorySwitchLock(action);
    });

    expect(action).toHaveBeenCalledTimes(1);
    expect(result.current.isCategorySwitching).toBe(true);

    act(() => {
      jest.runAllTimers();
    });

    expect(result.current.isCategorySwitching).toBe(false);
  });

  it('ignores rapid repeated lock requests', () => {
    const action = jest.fn();
    const { result } = renderHook(() => useCategorySwitchLock());

    act(() => {
      result.current.withCategorySwitchLock(action);
      result.current.withCategorySwitchLock(action);
      result.current.withCategorySwitchLock(action);
    });

    expect(action).toHaveBeenCalledTimes(1);
  });
});
