import { localStorageGetItem, localStorageRemoveItem } from './browser-local-storage';

export type ConsentStatus = 'granted' | 'denied' | null;

export const CONSENT_STORAGE_KEY = 'cookie_consent';
export const CONSENT_EXPIRY_DAYS = 365;

export interface ConsentPreferences {
  analytics: ConsentStatus;
  timestamp: number;
}

export function readCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const prefix = `${name}=`;
  const cookies = document.cookie.split(';');
  for (const rawCookie of cookies) {
    const cookie = rawCookie.trim();
    if (cookie.startsWith(prefix)) {
      return decodeURIComponent(cookie.slice(prefix.length));
    }
  }
  return null;
}

export function writeCookieValue(name: string, value: string, expiryDays: number): void {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

export function parseConsent(raw: string | null): ConsentPreferences | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ConsentPreferences>;
    if (
      typeof parsed.timestamp !== 'number' ||
      !Number.isFinite(parsed.timestamp) ||
      (parsed.analytics !== 'granted' && parsed.analytics !== 'denied' && parsed.analytics !== null)
    ) {
      return null;
    }
    const now = Date.now();
    const expiryTime = parsed.timestamp + CONSENT_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    if (now >= expiryTime) {
      return null;
    }
    return {
      analytics: parsed.analytics,
      timestamp: parsed.timestamp,
    };
  } catch {
    return null;
  }
}

export function readConsentPreferences(): ConsentPreferences | null {
  if (typeof window === 'undefined') return null;

  const fromCookie = parseConsent(readCookieValue(CONSENT_STORAGE_KEY));
  if (fromCookie) {
    return fromCookie;
  }

  const fromStorage = parseConsent(localStorageGetItem(CONSENT_STORAGE_KEY));
  if (fromStorage) {
    return fromStorage;
  }

  localStorageRemoveItem(CONSENT_STORAGE_KEY);
  return null;
}

export function isAnalyticsConsentGranted(): boolean {
  return readConsentPreferences()?.analytics === 'granted';
}
