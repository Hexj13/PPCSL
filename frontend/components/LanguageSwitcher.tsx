'use client';

import { useMemo } from 'react';

import { useI18n } from '@/components/I18nProvider';
import { setStoredLocale, type Locale } from '@/lib/i18n';

import { Dropdown } from './Dropdown';

const headerFooterStyle =
  'header-language-switcher !bg-transparent !text-white font-medium text-xs md:text-xs lg:text-xs xl:text-sm hover:!text-primary-100 active:!text-primary-300 transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 md:gap-2 rounded-lg select-none [&_span]:!text-white [&_span]:hover:!text-primary-100 [&_svg]:!text-white [&_svg]:hover:!text-primary-100';

const getLanguageAbbreviation = (locale: Locale): string => {
  const abbreviations: Record<Locale, string> = {
    ro: 'RO',
    ru: 'RU',
  };
  return abbreviations[locale] || locale.toUpperCase();
};

export function LanguageSwitcher({
  variant = 'desktop',
  context: _context = 'footer',
}: {
  variant?: 'desktop' | 'mobile';
  context?: 'header' | 'footer';
}) {
  const { locale } = useI18n();

  const languages = useMemo(
    () => [
      { value: 'ro' as Locale, label: getLanguageAbbreviation('ro') },
      { value: 'ru' as Locale, label: getLanguageAbbreviation('ru') },
    ],
    []
  );

  const handleLanguageChange = (newLocale: string) => {
    const localeValue = newLocale as Locale;
    if (localeValue !== locale) {
      setStoredLocale(localeValue);
      window.location.reload();
    }
  };

  const buttonClassName = headerFooterStyle;

  const mobileButtonClassName =
    variant === 'mobile'
      ? 'header-language-switcher-mobile !bg-transparent !text-white font-medium text-base hover:!text-primary-100 active:!text-primary-300 transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-1.5 px-2.5 py-3.5 rounded-lg select-none w-full [&_span]:!text-white [&_span]:hover:!text-primary-100 [&_svg]:!text-white [&_svg]:hover:!text-primary-100'
      : buttonClassName;

  const currentLanguageAbbr = getLanguageAbbreviation(locale);

  const languageIcon = (
    <svg
      className="w-4 h-4 text-white flex-shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
      />
    </svg>
  );

  return (
    <div className={variant === 'mobile' ? 'w-full' : ''} suppressHydrationWarning>
      <div suppressHydrationWarning>
        <Dropdown
          value={locale}
          onChange={handleLanguageChange}
          options={languages}
          placeholder={currentLanguageAbbr}
          buttonClassName={mobileButtonClassName}
          autoPosition={true}
          searchable={false}
          rightIcon={languageIcon}
        />
      </div>
    </div>
  );
}
