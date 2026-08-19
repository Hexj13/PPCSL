import { headers } from 'next/headers';

import { getDefaultLocale, getMetadataLocaleFromRequest } from './i18n';
import { URL_PATHNAME_REQUEST_HEADER } from './url-locale';

jest.mock('next/headers', () => ({
  headers: jest.fn(),
}));

const mockHeaders = headers as jest.MockedFunction<typeof headers>;

describe('getMetadataLocaleFromRequest', () => {
  const originalSwitcher = process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER;

  afterEach(() => {
    mockHeaders.mockReset();
    if (originalSwitcher === undefined) {
      delete process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER;
    } else {
      process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER = originalSwitcher;
    }
  });

  it('returns default locale when the language switcher is disabled', async () => {
    process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER = 'false';
    mockHeaders.mockResolvedValue({
      get: () => '/ru/unknown',
    } as unknown as Awaited<ReturnType<typeof headers>>);

    await expect(getMetadataLocaleFromRequest()).resolves.toBe(getDefaultLocale());
  });

  it('returns the prefixed locale from the request pathname header', async () => {
    process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER = 'true';
    mockHeaders.mockResolvedValue({
      get: (name: string) => (name === URL_PATHNAME_REQUEST_HEADER ? '/ru/unknown' : null),
    } as unknown as Awaited<ReturnType<typeof headers>>);

    await expect(getMetadataLocaleFromRequest()).resolves.toBe('ru');
  });

  it('returns en for an English prefixed unknown path', async () => {
    process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER = 'true';
    mockHeaders.mockResolvedValue({
      get: (name: string) => (name === URL_PATHNAME_REQUEST_HEADER ? '/en/x' : null),
    } as unknown as Awaited<ReturnType<typeof headers>>);

    await expect(getMetadataLocaleFromRequest()).resolves.toBe('en');
  });

  it('returns default locale when the pathname has no locale prefix', async () => {
    process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER = 'true';
    mockHeaders.mockResolvedValue({
      get: (name: string) => (name === URL_PATHNAME_REQUEST_HEADER ? '/no-such-page' : null),
    } as unknown as Awaited<ReturnType<typeof headers>>);

    await expect(getMetadataLocaleFromRequest()).resolves.toBe(getDefaultLocale());
  });

  it('returns default locale when the pathname header is missing', async () => {
    process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER = 'true';
    mockHeaders.mockResolvedValue({
      get: () => null,
    } as unknown as Awaited<ReturnType<typeof headers>>);

    await expect(getMetadataLocaleFromRequest()).resolves.toBe(getDefaultLocale());
  });

  it('returns default locale when headers() throws', async () => {
    process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER = 'true';
    mockHeaders.mockRejectedValue(new Error('headers() called outside a request'));

    await expect(getMetadataLocaleFromRequest()).resolves.toBe(getDefaultLocale());
  });
});
