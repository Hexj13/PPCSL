'use client';

import { useRouter } from 'next/navigation';
import { startTransition, useMemo } from 'react';

import { useI18n } from '@/components/providers/I18nProvider';
import { useTranslation } from '@/hooks/useTranslation';
import { authApi } from '@/lib/api';
import { setStoredLocale, type Locale } from '@/lib/i18n';
import { resolveLocaleRouting, shouldShowLanguageSwitcher } from '@/lib/locale-routing';
import { loadSiteConfigSync } from '@/lib/site-config';
import { useAuthStore } from '@/lib/store';
import { localePrefixPath, stripLocalePrefixFromPathname } from '@/lib/url-locale';
import { getCountry } from '@/lib/utils';

import { Dropdown } from './Dropdown';

const headerStyle =
  'header-language-switcher bg-transparent! text-primary-900! font-medium text-sm hover-only:hover:text-primary-700! active:text-primary-700! transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 md:gap-2 rounded-lg select-none [&_span]:text-primary-900! hover-only:hover:[&_span]:text-primary-700! [&_svg]:text-primary-900! hover-only:hover:[&_svg]:text-primary-700!';

const footerStyle =
  'header-language-switcher bg-transparent! text-white! font-medium text-sm hover-only:hover:text-primary-100! active:text-primary-300! transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 md:gap-2 rounded-lg select-none [&_span]:text-white! hover-only:hover:[&_span]:text-primary-100! [&_svg]:text-white! hover-only:hover:[&_svg]:text-primary-100!';

const LOCALE_FLAG_EMOJI: Readonly<Record<string, string>> = {
  ro: '🇷🇴',
  ru: '🇷🇺',
  en: '🇬🇧',
  sq: '🇦🇱',
};

export function LanguageSwitcher({
  variant = 'desktop',
  context = 'footer',
}: {
  variant?: 'desktop' | 'mobile';
  context?: 'header' | 'footer';
}) {
  const { locale } = useI18n();
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const site = useMemo(() => loadSiteConfigSync(getCountry()), []);
  const routing = useMemo(() => resolveLocaleRouting(site), [site]);

  const languages = useMemo(
    () =>
      routing.supportedLocales.map((value) => {
        const low = value.toLowerCase();
        const key = routing.languageSwitcherTranslationKeys[low] ?? 'common.languageLocaleCode';
        const label =
          key === 'common.languageLocaleCode' ? t(key, { code: value.toUpperCase() }) : t(key);
        return {
          value: value as Locale,
          label,
          leadingEmoji: LOCALE_FLAG_EMOJI[low],
        };
      }),
    [routing, t],
  );

  const handleLanguageChange = (newLocale: string) => {
    const localeValue = newLocale as Locale;
    if (localeValue === locale) {
      return;
    }
    if (typeof window === 'undefined') {
      return;
    }
    const path = window.location.pathname;
    const search = window.location.search;
    const { restPath } = stripLocalePrefixFromPathname(path);
    const nextPath = localePrefixPath(restPath, localeValue);
    setStoredLocale(localeValue);
    startTransition(() => {
      router.push(`${nextPath}${search}`);
      router.refresh();
    });
    if (user) {
      void authApi.updateProfile({ preferredLocale: localeValue }).catch(() => {});
    }
  };

  const desktopButtonClassName = context === 'footer' ? footerStyle : headerStyle;

  const mobileButtonClassName =
    variant === 'mobile'
      ? 'header-language-switcher-mobile bg-transparent! text-primary-900! font-medium text-[14px] hover-only:hover:text-primary-700! active:text-primary-700! transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-1.5 px-2.5 py-3.5 rounded-lg select-none [&_span]:text-primary-900! hover-only:hover:[&_span]:text-primary-700! [&_svg]:text-primary-900! hover-only:hover:[&_svg]:text-primary-700!'
      : desktopButtonClassName;

  const currentLanguageName = useMemo(() => {
    const entry = languages.find((l) => l.value === locale);
    return entry?.label ?? t('common.languageLocaleCode', { code: locale.toUpperCase() });
  }, [languages, locale, t]);

  if (!shouldShowLanguageSwitcher(site)) {
    return null;
  }

  const iconColorClass = context === 'footer' ? 'text-white' : 'text-primary-900';

  const languageIcon = (
    <svg
      className={`w-4 h-4 shrink-0 ${iconColorClass}`}
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
    <div className={variant === 'mobile' ? 'inline-flex' : ''} suppressHydrationWarning>
      <div suppressHydrationWarning>
        <Dropdown
          value={locale}
          onChange={handleLanguageChange}
          options={languages}
          placeholder={currentLanguageName}
          buttonClassName={mobileButtonClassName}
          autoPosition={true}
          renderMenuInPortal
          searchable={false}
          rightIcon={languageIcon}
          menuSelectedStyle="checkmark"
          menuExpandToContent
          dataTestId="language-switcher"
        />
      </div>
    </div>
  );
}
