'use client';

import { useMemo } from 'react';

import { useI18n } from '@/components/I18nProvider';
import { setStoredLocale, type Locale } from '@/lib/i18n';

import { Dropdown } from './Dropdown';

const headerFooterStyle =
  'header-language-switcher !bg-transparent !text-white font-medium text-xs md:text-xs lg:text-xs xl:text-sm hover:!text-primary-100 active:!text-primary-300 transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 md:gap-2 rounded-lg select-none [&_span]:!text-white [&_span]:hover:!text-primary-100 [&_svg]:!text-white [&_svg]:hover:!text-primary-100';

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

  const mobileButtonClassName =
    variant === 'mobile'
      ? 'header-language-switcher-mobile !bg-transparent !text-white font-medium text-base hover:!text-primary-100 active:!text-primary-300 transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-1.5 px-2.5 py-3.5 rounded-lg select-none w-full [&_span]:!text-white [&_span]:hover:!text-primary-100 [&_svg]:!text-white [&_svg]:hover:!text-primary-100'
      : buttonClassName;

  return (
    <div className={variant === 'mobile' ? 'w-full' : ''} suppressHydrationWarning>
      <div suppressHydrationWarning>
        <Dropdown
          value={locale}
          onChange={handleLanguageChange}
          options={languages}
          placeholder={selectedLanguage?.label || languages[0].label}
          buttonClassName={mobileButtonClassName}
          autoPosition={true}
          searchable={false}
        />
      </div>
    </div>
  );
}
