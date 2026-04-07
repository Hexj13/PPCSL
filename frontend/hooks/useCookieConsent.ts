'use client';

import { useEffect, useState } from 'react';

import { invalidateConsentCache, invokeGtag } from '@/lib/analytics';
import {
  isStorageAccessError,
  localStorageGetItem,
  localStorageRemoveItem,
  localStorageSetItem,
} from '@/lib/browser-local-storage';

type ConsentStatus = 'granted' | 'denied' | null;

const CONSENT_STORAGE_KEY = 'cookie_consent';
const CONSENT_EXPIRY_DAYS = 365;

interface ConsentPreferences {
  analytics: ConsentStatus;
  timestamp: number;
}

function readCookieValue(name: string): string | null {
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

function writeCookieValue(name: string, value: string, expiryDays: number): void {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function parseConsent(raw: string | null): ConsentPreferences | null {
  if (!raw) return null;
  const parsed: ConsentPreferences = JSON.parse(raw);
  const now = Date.now();
  const expiryTime = parsed.timestamp + CONSENT_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  if (now >= expiryTime) {
    return null;
  }
  return parsed;
}

export function useCookieConsent() {
  const [consent, setConsent] = useState<ConsentPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const cookieStored = readCookieValue(CONSENT_STORAGE_KEY);
      const parsedFromCookie = parseConsent(cookieStored);
      if (parsedFromCookie) {
        setConsent(parsedFromCookie);
      } else {
        const stored = localStorageGetItem(CONSENT_STORAGE_KEY);
        const parsedFromStorage = parseConsent(stored);
        if (parsedFromStorage) {
          setConsent(parsedFromStorage);
        } else {
          localStorageRemoveItem(CONSENT_STORAGE_KEY);
        }
      }
    } catch (error) {
      if (!isStorageAccessError(error)) {
        console.error('Error reading cookie consent:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateConsent = (analytics: ConsentStatus) => {
    if (typeof window === 'undefined') return;

    const preferences: ConsentPreferences = {
      analytics,
      timestamp: Date.now(),
    };

    try {
      writeCookieValue(CONSENT_STORAGE_KEY, JSON.stringify(preferences), CONSENT_EXPIRY_DAYS);
      localStorageSetItem(CONSENT_STORAGE_KEY, JSON.stringify(preferences));
      invalidateConsentCache();
      setConsent(preferences);

      const analyticsStorage = analytics === 'granted' ? 'granted' : 'denied';

      invokeGtag(() =>
        window.gtag('consent', 'update', {
          analytics_storage: analyticsStorage,
          ad_storage: analyticsStorage,
        }),
      );

      if (window.dataLayer) {
        window.dataLayer.push({
          event: 'consent_update',
          analytics_storage: analyticsStorage,
          ad_storage: analyticsStorage,
        });
      }
    } catch (error) {
      if (!isStorageAccessError(error)) {
        console.error('Error saving cookie consent:', error);
      }
    }
  };

  const grantConsent = () => {
    updateConsent('granted');
  };

  const denyConsent = () => {
    updateConsent('denied');
  };

  return {
    consent: consent?.analytics ?? null,
    isLoading,
    hasConsent: consent !== null,
    grantConsent,
    denyConsent,
  };
}
