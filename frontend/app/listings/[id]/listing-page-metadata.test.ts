/**
 * @jest-environment node
 */
import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { URL_LOCALE_HEADER } from '@/lib/url-locale';

const headersGet = jest.fn();

jest.mock('next/headers', () => ({
  headers: async () => ({ get: (name: string) => headersGet(name) }),
  cookies: async () => ({ get: () => undefined }),
}));

import { generateMetadata } from './page';

describe('listings/[id]/page generateMetadata not-found', () => {
  const originalSwitcher = process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER = 'true';
    headersGet.mockReset();
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER = originalSwitcher;
  });

  it('uses locale-prefixed canonical for invalid listing id when url locale is ru', async () => {
    headersGet.mockImplementation((name: string) => (name === URL_LOCALE_HEADER ? 'ru' : null));
    const meta = await generateMetadata({
      params: Promise.resolve({ id: 'not-a-valid-id' }),
    });
    const canonical = meta.alternates?.canonical;
    expect(typeof canonical).toBe('string');
    expect(canonical).toContain('/ru/listings/');
    expect(canonical).toContain(encodeURIComponent('not-a-valid-id'));
  });

  it('uses RO canonical when url locale is ro', async () => {
    headersGet.mockImplementation((name: string) => (name === URL_LOCALE_HEADER ? 'ro' : null));
    const meta = await generateMetadata({
      params: Promise.resolve({ id: 'bad-id' }),
    });
    const canonical = meta.alternates?.canonical as string;
    expect(canonical).not.toMatch(/\/ru\/listings\//);
    expect(canonical).toContain('/listings/');
  });
});
