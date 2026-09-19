import { describe, expect, it } from '@jest/globals';

import {
  CLIENT_ABORTED_RSC_STREAM_MESSAGE,
  isClientAbortedRscStreamError,
} from './sentry-request-error';

describe('isClientAbortedRscStreamError', () => {
  it('returns true for Error with the client-aborted RSC stream message', () => {
    expect(isClientAbortedRscStreamError(new Error(CLIENT_ABORTED_RSC_STREAM_MESSAGE))).toBe(true);
  });

  it('returns true for the client-aborted RSC stream message string', () => {
    expect(isClientAbortedRscStreamError(CLIENT_ABORTED_RSC_STREAM_MESSAGE)).toBe(true);
  });

  it('returns false for a different Error', () => {
    expect(isClientAbortedRscStreamError(new Error('Render failed'))).toBe(false);
  });

  it('returns false for AbortError', () => {
    const abortError = new Error('The operation was aborted.');
    abortError.name = 'AbortError';
    expect(isClientAbortedRscStreamError(abortError)).toBe(false);
  });

  it('returns false for empty values', () => {
    expect(isClientAbortedRscStreamError(undefined)).toBe(false);
    expect(isClientAbortedRscStreamError(null)).toBe(false);
    expect(isClientAbortedRscStreamError('')).toBe(false);
  });
});
