/**
 * @jest-environment jsdom
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockLocalStorageGetItem = jest.fn(() => null as string | null);
const mockLocalStorageRemoveItem = jest.fn();

jest.mock('@/lib/browser-local-storage', () => ({
  localStorageGetItem: (...args: unknown[]) => mockLocalStorageGetItem(...args),
  localStorageRemoveItem: (...args: unknown[]) => mockLocalStorageRemoveItem(...args),
}));

import {
  CONSENT_STORAGE_KEY,
  isAnalyticsConsentGranted,
  parseConsent,
  readConsentPreferences,
} from './cookie-consent';

describe('cookie-consent', () => {
  beforeEach(() => {
    document.cookie = `${CONSENT_STORAGE_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    mockLocalStorageGetItem.mockReset();
    mockLocalStorageGetItem.mockReturnValue(null);
    mockLocalStorageRemoveItem.mockReset();
  });

  describe('parseConsent', () => {
    it('returns null for missing or invalid JSON', () => {
      expect(parseConsent(null)).toBeNull();
      expect(parseConsent('not-json')).toBeNull();
      expect(
        parseConsent(JSON.stringify({ analytics: 'maybe', timestamp: Date.now() })),
      ).toBeNull();
      expect(parseConsent(JSON.stringify({ analytics: 'granted' }))).toBeNull();
    });

    it('returns null when consent is expired', () => {
      const expired = JSON.stringify({
        analytics: 'granted',
        timestamp: Date.now() - 400 * 24 * 60 * 60 * 1000,
      });
      expect(parseConsent(expired)).toBeNull();
    });

    it('returns preferences when still valid', () => {
      const raw = JSON.stringify({
        analytics: 'granted',
        timestamp: Date.now(),
      });
      expect(parseConsent(raw)).toEqual({
        analytics: 'granted',
        timestamp: expect.any(Number),
      });
    });
  });

  describe('readConsentPreferences', () => {
    it('prefers cookie over localStorage', () => {
      const cookiePrefs = {
        analytics: 'granted' as const,
        timestamp: Date.now(),
      };
      document.cookie = `${CONSENT_STORAGE_KEY}=${encodeURIComponent(JSON.stringify(cookiePrefs))}; path=/`;
      mockLocalStorageGetItem.mockReturnValue(
        JSON.stringify({ analytics: 'denied', timestamp: Date.now() }),
      );

      expect(readConsentPreferences()).toEqual(cookiePrefs);
      expect(isAnalyticsConsentGranted()).toBe(true);
      expect(mockLocalStorageGetItem).not.toHaveBeenCalled();
    });

    it('falls back to localStorage when cookie is absent', () => {
      const storagePrefs = {
        analytics: 'granted' as const,
        timestamp: Date.now(),
      };
      mockLocalStorageGetItem.mockReturnValue(JSON.stringify(storagePrefs));

      expect(readConsentPreferences()).toEqual(storagePrefs);
      expect(isAnalyticsConsentGranted()).toBe(true);
    });

    it('clears localStorage and returns null when neither source has valid consent', () => {
      mockLocalStorageGetItem.mockReturnValue(null);

      expect(readConsentPreferences()).toBeNull();
      expect(isAnalyticsConsentGranted()).toBe(false);
      expect(mockLocalStorageRemoveItem).toHaveBeenCalledWith(CONSENT_STORAGE_KEY);
    });

    it('treats denied analytics consent as not granted', () => {
      const cookiePrefs = {
        analytics: 'denied' as const,
        timestamp: Date.now(),
      };
      document.cookie = `${CONSENT_STORAGE_KEY}=${encodeURIComponent(JSON.stringify(cookiePrefs))}; path=/`;

      expect(readConsentPreferences()?.analytics).toBe('denied');
      expect(isAnalyticsConsentGranted()).toBe(false);
    });
  });
});
