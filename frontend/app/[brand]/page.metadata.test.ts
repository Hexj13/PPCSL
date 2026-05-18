/**
 * @jest-environment node
 */
import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('next/navigation', () => {
  const permanentRedirectInner = jest.fn((href: string) => {
    const err = new Error(`REDIRECT:${href}`);
    Object.assign(err, { digest: 'NEXT_REDIRECT' });
    throw err;
  });
  return {
    permanentRedirect: permanentRedirectInner,
    notFound: jest.fn(() => {
      throw new Error('NOT_FOUND');
    }),
  };
});

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return {
    ...actual,
    fetchBrands: jest.fn(),
    getListings: jest.fn(),
  };
});

const headersGet = jest.fn();

jest.mock('next/headers', () => ({
  headers: async () => ({ get: (name: string) => headersGet(name) }),
  cookies: async () => ({ get: () => undefined }),
}));

import { permanentRedirect } from 'next/navigation';

import { fetchBrands, getListings } from '@/lib/api';
import { URL_LOCALE_HEADER } from '@/lib/url-locale';

import { generateMetadata } from './page';

const mockFetchBrands = jest.mocked(fetchBrands);
const mockGetListings = jest.mocked(getListings);
const mockPermanentRedirect = jest.mocked(permanentRedirect);

describe('[brand]/page generateMetadata', () => {
  const originalSwitcher = process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER = 'true';
    headersGet.mockReset();
    mockPermanentRedirect.mockClear();
    mockFetchBrands.mockResolvedValue([{ id: 1, name: 'BMW' } as { id: number; name: string }]);
    mockGetListings.mockResolvedValue({ data: [], meta: { totalPages: 0 } });
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER = originalSwitcher;
  });

  it('returns noindex metadata for unknown brand slug', async () => {
    headersGet.mockImplementation((name: string) => (name === URL_LOCALE_HEADER ? 'ro' : null));
    const meta = await generateMetadata({
      params: Promise.resolve({ brand: 'unknown-brand-slug-xyz' }),
      searchParams: Promise.resolve({}),
    });
    expect(meta.robots).toEqual({ index: false, follow: true });
    expect(mockPermanentRedirect).not.toHaveBeenCalled();
  });

  it('sets robots noindex when extra query keys are present', async () => {
    headersGet.mockImplementation((name: string) => (name === URL_LOCALE_HEADER ? 'ro' : null));
    const meta = await generateMetadata({
      params: Promise.resolve({ brand: 'bmw' }),
      searchParams: Promise.resolve({ page: '1' }),
    });
    expect(meta.robots).toEqual({ index: false, follow: true });
    expect(meta.alternates?.canonical).toBeDefined();
    expect(mockPermanentRedirect).not.toHaveBeenCalled();
  });

  it('calls permanentRedirect when vehicleType is car (strip from URL)', async () => {
    headersGet.mockImplementation((name: string) => (name === URL_LOCALE_HEADER ? 'ro' : null));
    await expect(
      generateMetadata({
        params: Promise.resolve({ brand: 'bmw' }),
        searchParams: Promise.resolve({ vehicleType: 'car' }),
      }),
    ).rejects.toThrow(/REDIRECT:/);
    expect(mockPermanentRedirect).toHaveBeenCalled();
    const href = String(mockPermanentRedirect.mock.calls[0]?.[0] ?? '');
    expect(href).toContain('/bmw');
    expect(href).not.toContain('vehicleType=car');
  });

  it('uses locale-prefixed canonical and hreflang when url locale is ru', async () => {
    headersGet.mockImplementation((name: string) => (name === URL_LOCALE_HEADER ? 'ru' : null));
    const meta = await generateMetadata({
      params: Promise.resolve({ brand: 'bmw' }),
      searchParams: Promise.resolve({}),
    });
    const canonical = String(meta.alternates?.canonical ?? '');
    expect(canonical).toMatch(/\/ru\/bmw(\?|$)/);
    const langs = meta.alternates?.languages as Record<string, string> | undefined;
    expect(langs?.ru).toBeDefined();
    expect(langs?.ro).toBeDefined();
    expect(langs?.['x-default']).toBeDefined();
    expect(mockPermanentRedirect).not.toHaveBeenCalled();
  });

  it('omits alternates.languages when language switcher is disabled', async () => {
    process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER = 'false';
    headersGet.mockImplementation((name: string) => (name === URL_LOCALE_HEADER ? 'ru' : null));
    const meta = await generateMetadata({
      params: Promise.resolve({ brand: 'bmw' }),
      searchParams: Promise.resolve({}),
    });
    expect(meta.alternates?.languages).toBeUndefined();
    expect(meta.alternates?.canonical).toBeDefined();
  });
});
