'use client';

import { useMemo } from 'react';

import { useI18n } from '@/components/I18nProvider';
import { setStoredLocale, type Locale } from '@/lib/i18n';

import { Dropdown } from './Dropdown';

const headerFooterStyle =
  '!bg-transparent !text-white font-medium text-xs md:text-sm lg:text-sm xl:text-base hover:!text-primary-100 active:!text-primary-300 transition-all duration-200 whitespace-nowrap flex items-center gap-2 md:gap-2.5 px-2.5 md:px-3 lg:px-3 xl:px-4 py-2 md:py-2.5 rounded-lg !border-2 !border-primary-300 active:!border-primary-500 select-none [&_span]:!text-white [&_span]:hover:!text-primary-100 [&_svg]:!text-white [&_svg]:hover:!text-primary-100';

export function LanguageSwitcher({
  variant = 'desktop',
  context: _context = 'footer',
}: {
  variant?: 'desktop' | 'mobile';
  context?: 'header' | 'footer';
}) {
  const { locale, translations } = useI18n();

  const languages = useMemo(
    () => [
      { value: 'ro' as Locale, label: translations.common.languageRo || 'Română' },
      { value: 'ru' as Locale, label: translations.common.languageRu || 'Русский' },
    ],
    [translations]
  );

  const handleLanguageChange = (newLocale: string) => {
    const localeValue = newLocale as Locale;
    if (localeValue !== locale) {
      setStoredLocale(localeValue);
      window.location.reload();
    }
  };

  const selectedLanguage = useMemo(
    () => languages.find((lang) => lang.value === locale),
    [languages, locale]
  );

  const buttonClassName = headerFooterStyle;

  return (
    <div className={variant === 'mobile' ? 'px-4 py-2' : ''} suppressHydrationWarning>
      <div suppressHydrationWarning>
        <Dropdown
          value={locale}
          onChange={handleLanguageChange}
          options={languages}
          placeholder={selectedLanguage?.label || languages[0].label}
          buttonClassName={buttonClassName}
          autoPosition={true}
          searchable={false}
        />
      </div>
    </div>
  );
}
