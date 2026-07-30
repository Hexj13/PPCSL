'use client';

import { useEffect, useState } from 'react';

import { invalidateConsentCache, invokeGtag } from '@/lib/analytics';
import { isStorageAccessError, localStorageSetItem } from '@/lib/browser-local-storage';
import {
  CONSENT_EXPIRY_DAYS,
  CONSENT_STORAGE_KEY,
  type ConsentPreferences,
  type ConsentStatus,
  readConsentPreferences,
  writeCookieValue,
} from '@/lib/cookie-consent';

export function useCookieConsent() {
  const [consent, setConsent] = useState<ConsentPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      setConsent(readConsentPreferences());
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
