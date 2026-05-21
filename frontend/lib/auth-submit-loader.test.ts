import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { AUTH_SUBMIT_LOADER_MIN_MS, waitForAuthSubmitLoaderMinDisplay } from './auth-submit-loader';

describe('auth-submit-loader', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('waits until AUTH_SUBMIT_LOADER_MIN_MS elapsed from startedAt', async () => {
    const startedAt = Date.now();
    const promise = waitForAuthSubmitLoaderMinDisplay(startedAt);
    jest.advanceTimersByTime(AUTH_SUBMIT_LOADER_MIN_MS - 1);
    await Promise.resolve();
    let settled = false;
    void promise.then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);
    jest.advanceTimersByTime(1);
    await promise;
    expect(settled).toBe(true);
  });

  it('does not wait when minimum time already elapsed', async () => {
    const startedAt = Date.now() - AUTH_SUBMIT_LOADER_MIN_MS;
    const promise = waitForAuthSubmitLoaderMinDisplay(startedAt);
    await promise;
    expect(jest.getTimerCount()).toBe(0);
  });
});
