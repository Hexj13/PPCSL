/**
 * @jest-environment jsdom
 */

import { getClientLocale } from './i18n';

describe('getClientLocale', () => {
  const originalEnv = process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER = 'true';
    localStorage.clear();
    document.cookie = 'ppcsl-locale=; path=/; max-age=0';
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
    document.cookie = 'ppcsl-locale=ro; path=/';
    expect(getClientLocale()).toBe('ru');
  });

  it('uses pathname override for URL locale before window path and cookie', () => {
    window.location.pathname = '/dacia';
    document.cookie = 'ppcsl-locale=ro; path=/';
    expect(getClientLocale('/ru/sign')).toBe('ru');
  });

  it('returns ru from cookie when pathname has no locale prefix', () => {
    window.location.pathname = '/dacia';
    document.cookie = 'ppcsl-locale=ru; path=/';
    expect(getClientLocale()).toBe('ru');
  });

  it('returns ru from localStorage when pathname has no prefix and cookie is absent', () => {
    window.location.pathname = '/dacia';
    localStorage.setItem('ppcsl-locale', 'ru');
    expect(getClientLocale()).toBe('ru');
  });

  it('prioritizes cookie over localStorage when pathname has no prefix', () => {
    window.location.pathname = '/compare';
    document.cookie = 'ppcsl-locale=ro; path=/';
    localStorage.setItem('ppcsl-locale', 'ru');
    expect(getClientLocale()).toBe('ro');
  });

  it('returns default when switcher disabled', () => {
    process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER = 'false';
    window.location.pathname = '/ru/foo';
    localStorage.setItem('ppcsl-locale', 'ru');
    expect(getClientLocale()).toBe('ro');
  });
});
