'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect } from 'react';

import {
  getDefaultLocale,
  getStoredLocale,
  loadTranslationsDynamic,
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
  initialTranslations?: Translations;
}

const defaultLocale = getDefaultLocale();

const I18nContext = createContext<I18nContextType>({
  locale: defaultLocale,
  translations: {} as Translations,
  isLoading: false,
});

export function I18nProvider({ children, initialLocale, initialTranslations }: I18nProviderProps) {
  const serverLocale = initialLocale || defaultLocale;

  const [locale, setLocale] = useState<Locale>(serverLocale);
  const [translations, setTranslations] = useState<Translations>(
    () => initialTranslations || ({} as Translations),
  );
  const [isLoading, setIsLoading] = useState(!initialTranslations);

  useEffect(() => {
    const storedLocale = getStoredLocale();
    if (storedLocale !== locale || !initialTranslations) {
      setIsLoading(true);
      void loadTranslationsDynamic(storedLocale).then((loaded) => {
        setLocale(storedLocale);
        setTranslations(loaded);
        setIsLoading(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <I18nContext.Provider value={{ locale, translations, isLoading }}>
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
