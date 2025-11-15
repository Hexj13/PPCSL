'use client';

import { useEffect, useState } from 'react';

type ConsentStatus = 'granted' | 'denied' | null;

const CONSENT_STORAGE_KEY = 'cookie_consent';
const CONSENT_EXPIRY_DAYS = 365;

interface ConsentPreferences {
  analytics: ConsentStatus;
  timestamp: number;
}

export function useCookieConsent() {
  const [consent, setConsent] = useState<ConsentPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
      if (stored) {
        const parsed: ConsentPreferences = JSON.parse(stored);
        const now = Date.now();
        const expiryTime = parsed.timestamp + CONSENT_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

        if (now < expiryTime) {
          setConsent(parsed);
        } else {
          localStorage.removeItem(CONSENT_STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error('Error reading cookie consent:', error);
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
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(preferences));
      setConsent(preferences);

      if (window.gtag) {
        window.gtag('consent', 'update', {
          analytics_storage: analytics === 'granted' ? 'granted' : 'denied',
        });
      }
    } catch (error) {
      console.error('Error saving cookie consent:', error);
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
