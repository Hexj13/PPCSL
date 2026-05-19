import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { LOCALE_KEY, setSecure } from '@/api/client';

type Locale = 'ro' | 'ru';

type Messages = Record<string, unknown>;

function getByPath(obj: unknown, path: string): string | undefined {
  const keys = path.split('.');
  let cur: unknown = obj;
  for (const k of keys) {
    if (cur && typeof cur === 'object' && k in cur) {
      cur = (cur as Record<string, unknown>)[k];
    } else {
      return undefined;
    }
  }
  return typeof cur === 'string' ? cur : undefined;
}

const catalogs: Record<Locale, Messages> = {
  ro: require('./ro.json') as Messages,
  ru: require('./ru.json') as Messages,
};

const enCatalog = require('./en.json') as Messages;

const I18nContext = createContext<{
  locale: Locale;
  setLocale: (l: Locale) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
} | null>(null);

const LOCALE_STORAGE = 'kupito-mobile-locale';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('ro');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await AsyncStorage.getItem(LOCALE_STORAGE);
      if (cancelled) return;
      if (stored === 'ro' || stored === 'ru') {
        setLocaleState(stored);
        await setSecure(LOCALE_KEY, stored);
        return;
      }
      const deviceLocales = Localization.getLocales();
      const tag = deviceLocales[0]?.languageCode?.toLowerCase();
      const initial: Locale = tag === 'ru' ? 'ru' : 'ro';
      setLocaleState(initial);
      await setSecure(LOCALE_KEY, initial);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setLocale = useCallback(async (l: Locale) => {
    setLocaleState(l);
    await AsyncStorage.setItem(LOCALE_STORAGE, l);
    await setSecure(LOCALE_KEY, l);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const raw =
        getByPath(catalogs[locale], key) ??
        getByPath(catalogs.ro, key) ??
        getByPath(enCatalog, key) ??
        key;
      const text = typeof raw === 'string' ? raw : key;
      if (!params) return text;
      return text.replace(/\{(\w+)\}/g, (m, k) => (params[k] != null ? String(params[k]) : m));
    },
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n requires I18nProvider');
  return ctx;
}
