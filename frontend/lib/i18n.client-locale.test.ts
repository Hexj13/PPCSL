/**
 * @jest-environment jsdom
 */

import { getClientLocale } from './i18n';

describe('getClientLocale', () => {
  const originalEnv = process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER = 'true';
    localStorage.clear();
    document.cookie = 'kupito-locale=; path=/; max-age=0';
    delete (window as unknown as { location?: unknown }).location;
    (window as unknown as { location: Location }).location = {
      pathname: '/',
    } as Location;
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER = originalEnv;
  });

  it('returns ru when pathname has /ru prefix (case insensitive)', () => {
    window.location.pathname = '/RU/dacia';
    expect(getClientLocale()).toBe('ru');
  });

  it('prioritizes URL over cookie', () => {
    window.location.pathname = '/ru/listings/x';
    document.cookie = 'kupito-locale=ro; path=/';
    expect(getClientLocale()).toBe('ru');
  });

  it('uses default locale on RO path even when cookie is ru', () => {
    window.location.pathname = '/dacia';
    document.cookie = 'kupito-locale=ru; path=/';
    expect(getClientLocale()).toBe('ro');
  });

  it('uses default locale on RO path even when localStorage is ru', () => {
    window.location.pathname = '/dacia';
    localStorage.setItem('kupito-locale', 'ru');
    expect(getClientLocale()).toBe('ro');
  });

  it('returns default when switcher disabled', () => {
    process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER = 'false';
    window.location.pathname = '/ru/foo';
    localStorage.setItem('kupito-locale', 'ru');
    expect(getClientLocale()).toBe('ro');
  });
});
