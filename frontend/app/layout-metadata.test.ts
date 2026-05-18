/**
 * @jest-environment node
 */
import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { URL_LOCALE_HEADER } from '@/lib/url-locale';

jest.mock('./globals.css', () => ({}));
jest.mock('next/font/google', () => ({
  Inter: () => ({ className: 'inter-mock' }),
}));

const headersGet = jest.fn();

jest.mock('next/headers', () => ({
  headers: async () => ({ get: (name: string) => headersGet(name) }),
  cookies: async () => ({ get: () => undefined }),
}));

import { generateMetadata } from './layout';

describe('root layout generateMetadata openGraph.url', () => {
  const originalSwitcher = process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER = 'true';
    headersGet.mockReset();
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER = originalSwitcher;
  });

  it('prefixes openGraph.url with /ru when url locale is ru', async () => {
    headersGet.mockImplementation((name: string) => (name === URL_LOCALE_HEADER ? 'ru' : null));
    const meta = await generateMetadata();
    const url = String(meta.openGraph?.url ?? '');
    expect(url.endsWith('/ru') || url.endsWith('/ru/')).toBe(true);
  });

  it('does not add /ru segment to openGraph.url for ro locale', async () => {
    headersGet.mockImplementation((name: string) => (name === URL_LOCALE_HEADER ? 'ro' : null));
    const meta = await generateMetadata();
    const url = String(meta.openGraph?.url ?? '');
    expect(url).not.toMatch(/\/ru(\/|$)/);
  });
});
