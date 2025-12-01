'use client';

import { createContext, useContext, ReactNode } from 'react';

import { loadTranslations, type Locale, type Translations } from '@/lib/i18n';

interface I18nContextType {
  locale: Locale;
  translations: Translations;
  isLoading: boolean;
}

const locale: Locale = 'mk';
const translations = loadTranslations(locale);

const I18nContext = createContext<I18nContextType>({
  locale,
  translations,
  isLoading: false,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  return (
    <I18nContext.Provider value={{ locale, translations, isLoading: false }}>
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
