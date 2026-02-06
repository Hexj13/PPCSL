'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';

import {
  getDefaultLocale,
  getStoredLocale,
  loadTranslations,
  type Locale,
  type Translations,
} from '@/lib/i18n';

interface I18nContextType {
  locale: Locale;
  translations: Translations;
  isLoading: boolean;
}

interface I18nProviderProps {
  children: ReactNode;
  initialLocale?: Locale;
}

const defaultLocale = getDefaultLocale();
const defaultTranslations = loadTranslations(defaultLocale);

const I18nContext = createContext<I18nContextType>({
  locale: defaultLocale,
  translations: defaultTranslations,
  isLoading: false,
});

export function I18nProvider({ children, initialLocale }: I18nProviderProps) {
  const serverLocale = initialLocale || defaultLocale;

  const [locale, setLocale] = useState<Locale>(serverLocale);
  const [translations, setTranslations] = useState<Translations>(() => {
    return loadTranslations(serverLocale) || defaultTranslations;
  });
  const [isLoading] = useState(false);

  useEffect(() => {
    const storedLocale = getStoredLocale();
    if (storedLocale !== locale) {
      setLocale(storedLocale);
      const loadedTranslations = loadTranslations(storedLocale);
      if (loadedTranslations) {
        setTranslations(loadedTranslations);
      }
    }
  }, [locale]);

  const safeTranslations = translations || defaultTranslations;

  return (
    <I18nContext.Provider value={{ locale, translations: safeTranslations, isLoading }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
