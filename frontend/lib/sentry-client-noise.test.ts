import { describe, expect, it } from '@jest/globals';
import type { Event } from '@sentry/nextjs';

import {
  shouldSuppressTurbopackWorkerJsonParseNoise,
  shouldSuppressWebKitStacklessXdNoise,
} from './sentry-client-noise';

const TRAILING_JSON_NOISE =
  'Uncaught SyntaxError: Unexpected non-whitespace character after JSON at position 12 (line 1 column 13)';

function sentryEvent(partial: Event): Event {
  return partial;
}

describe('shouldSuppressTurbopackWorkerJsonParseNoise', () => {
  it('drops a trailing JSON SyntaxError from a turbopack-worker chunk', () => {
    const event = sentryEvent({
      exception: {
        values: [
          {
            type: 'SyntaxError',
            value: TRAILING_JSON_NOISE,
            stacktrace: {
              frames: [
                {
                  filename: 'app:///_next/static/chunks/turbopack-worker-abc123.js',
                },
              ],
            },
          },
        ],
      },
    });
    expect(shouldSuppressTurbopackWorkerJsonParseNoise(event)).toBe(true);
  });

  it('drops when only abs_path mentions the turbopack-worker chunk', () => {
    const event = sentryEvent({
      exception: {
        values: [
          {
            type: 'Error',
            value: TRAILING_JSON_NOISE,
            stacktrace: {
              frames: [
                {
                  abs_path: 'https://example.test/_next/static/chunks/turbopack-worker-xyz.js',
                },
              ],
            },
          },
        ],
      },
    });
    expect(shouldSuppressTurbopackWorkerJsonParseNoise(event)).toBe(true);
  });

  it('does not drop the same JSON parse error without a turbopack-worker frame', () => {
    const event = sentryEvent({
      exception: {
        values: [
          {
            type: 'SyntaxError',
            value: TRAILING_JSON_NOISE,
            stacktrace: {
              frames: [{ filename: 'app:///lib/search/search-params-parse.ts' }],
            },
          },
        ],
      },
    });
    expect(shouldSuppressTurbopackWorkerJsonParseNoise(event)).toBe(false);
  });

  it('does not drop a JSON parse error when only a sibling exception mentions turbopack-worker', () => {
    const event = sentryEvent({
      exception: {
        values: [
          {
            type: 'SyntaxError',
            value: TRAILING_JSON_NOISE,
            stacktrace: {
              frames: [{ filename: 'app:///lib/search/search-params-parse.ts' }],
            },
          },
          {
            type: 'TypeError',
            value: 'e.indexOf is not a function',
            stacktrace: {
              frames: [
                {
                  filename: 'app:///_next/static/chunks/turbopack-worker-abc123.js',
                },
              ],
            },
          },
        ],
      },
    });
    expect(shouldSuppressTurbopackWorkerJsonParseNoise(event)).toBe(false);
  });

  it('does not drop other errors from a turbopack-worker chunk', () => {
    const event = sentryEvent({
      exception: {
        values: [
          {
            type: 'TypeError',
            value: 'e.indexOf is not a function',
            stacktrace: {
              frames: [
                {
                  filename: 'app:///_next/static/chunks/turbopack-worker-abc123.js',
                },
              ],
            },
          },
        ],
      },
    });
    expect(shouldSuppressTurbopackWorkerJsonParseNoise(event)).toBe(false);
  });
});

describe('shouldSuppressWebKitStacklessXdNoise', () => {
  it('drops the stackless WebKit Xd unhandledrejection on Chrome Mobile iOS', () => {
    const event = sentryEvent({
      exception: {
        values: [
          {
            type: 'Error',
            value: 'Xd',
            mechanism: { type: 'onunhandledrejection' },
          },
        ],
      },
      contexts: {
        os: { name: 'iOS' },
        browser: { name: 'Chrome Mobile iOS' },
      },
    });
    expect(shouldSuppressWebKitStacklessXdNoise(event)).toBe(true);
  });

  it('does not drop Xd when a stack frame is present', () => {
    const event = sentryEvent({
      exception: {
        values: [
          {
            type: 'Error',
            value: 'Xd',
            mechanism: { type: 'onunhandledrejection' },
            stacktrace: { frames: [{ filename: 'app:///instrumentation-client.ts' }] },
          },
        ],
      },
      contexts: {
        os: { name: 'iOS' },
        browser: { name: 'Chrome Mobile iOS' },
      },
    });
    expect(shouldSuppressWebKitStacklessXdNoise(event)).toBe(false);
  });
});
