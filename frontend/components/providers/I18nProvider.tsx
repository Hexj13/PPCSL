'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

import {
  getClientLocale,
  getDefaultLocale,
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
  const pathname = usePathname();
  const hydratedTranslations = useRef(Boolean(initialTranslations));
  const syncGeneration = useRef(0);

  const [locale, setLocale] = useState<Locale>(serverLocale);
  const [translations, setTranslations] = useState<Translations>(
    () => initialTranslations || ({} as Translations),
  );
  const [isLoading, setIsLoading] = useState(!initialTranslations);

  useEffect(() => {
    const clientLocale = getClientLocale();
    const sync = () => {
      const gen = ++syncGeneration.current;
      setIsLoading(true);
      void loadTranslationsDynamic(clientLocale).then((loaded) => {
        if (gen !== syncGeneration.current) {
          return;
        }
        setLocale(clientLocale);
        setTranslations(loaded);
        setIsLoading(false);
        hydratedTranslations.current = true;
      });
    };

    if (clientLocale !== locale) {
      sync();
      return;
    }

    if (!hydratedTranslations.current) {
      sync();
    }
  }, [pathname, locale]);

  const contextValue = useMemo(
    () => ({ locale, translations, isLoading }),
    [locale, translations, isLoading],
  );

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
