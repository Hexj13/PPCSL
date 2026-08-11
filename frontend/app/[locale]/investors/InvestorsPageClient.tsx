'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { startTransition, useCallback, useMemo } from 'react';

import { Dropdown } from '@/components/common/Dropdown';
import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import { useTranslation } from '@/hooks/useTranslation';
import { authApi } from '@/lib/api';
import { setStoredLocale, type Locale } from '@/lib/i18n';
import type { Translations } from '@/lib/i18n-types';
import { resolveLocaleRouting } from '@/lib/locale-routing';
import { loadSiteConfigSync } from '@/lib/site-config';
import { useAuthStore } from '@/lib/store';
import { localePrefixPath } from '@/lib/url-locale';
import { getCountry } from '@/lib/utils';

const SECTION_IDS = [
  'about',
  'done',
  'product',
  'businessModel',
  'vision',
  'strategy',
  'scaling',
  'whyNow',
  'offer',
] as const;

type InvestorsBundle = Translations['investors'];

type InvestorsBlock = {
  title: string;
  lead?: string;
  paragraphs?: string[];
  items?: string[];
  footer?: string;
};

const investorsDropdownButtonClass =
  'header-language-switcher bg-transparent! text-primary-900! font-medium text-sm hover-only:hover:text-primary-700! active:text-primary-700! transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 md:gap-2 rounded-lg select-none [&_span]:text-primary-900! hover-only:hover:[&_span]:text-primary-700! [&_svg]:text-primary-900! hover-only:hover:[&_svg]:text-primary-700!';

const SECONDARY_TEXT_STYLE = { color: 'rgb(var(--text-secondary-rgb))' } as const;

function hasLead(block: InvestorsBlock): block is InvestorsBlock & { lead: string } {
  return typeof block.lead === 'string' && block.lead.length > 0;
}

function hasFooter(block: InvestorsBlock): block is InvestorsBlock & { footer: string } {
  return typeof block.footer === 'string' && block.footer.length > 0;
}

const languageIcon = (
  <svg
    className="w-4 h-4 shrink-0 text-primary-900"
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

export function InvestorsPageClient({
  initialLocale,
  initialInvestors,
}: {
  initialLocale: Locale;
  initialInvestors: InvestorsBundle;
}) {
  const { href } = useLocalizedNavigation();
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const site = useMemo(() => loadSiteConfigSync(getCountry()), []);
  const routing = useMemo(() => resolveLocaleRouting(site), [site]);
  const content = initialInvestors;

  const localeOptions = useMemo(
    () =>
      routing.supportedLocales.map((value) => {
        const low = value.toLowerCase();
        const key = routing.languageSwitcherTranslationKeys[low] ?? 'common.languageLocaleCode';
        const label =
          key === 'common.languageLocaleCode' ? t(key, { code: value.toUpperCase() }) : t(key);
        return { value: low, label };
      }),
    [routing.languageSwitcherTranslationKeys, routing.supportedLocales, t],
  );

  const currentLabel = useMemo(
    () =>
      localeOptions.find((o) => o.value === initialLocale)?.label ?? initialLocale.toUpperCase(),
    [initialLocale, localeOptions],
  );

  const handleLocaleChange = useCallback(
    (value: string) => {
      const localeValue = value.toLowerCase() as Locale;
      if (localeValue === initialLocale) {
        return;
      }
      if (!routing.supportedLocales.map((s) => s.toLowerCase()).includes(localeValue)) {
        return;
      }
      setStoredLocale(localeValue);
      startTransition(() => {
        router.push(localePrefixPath('/investors', localeValue));
        router.refresh();
      });
      if (user) {
        void authApi.updateProfile({ preferredLocale: localeValue }).catch(() => {});
      }
    },
    [initialLocale, routing.supportedLocales, router, user],
  );

  return (
    <div className="max-w-4xl mx-auto pt-4 md:pt-6">
      <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-primary-900">{content.title}</h1>
      {localeOptions.length > 1 ? (
        <div className="mb-8 inline-flex max-w-full">
          <Dropdown
            className="w-fit"
            value={initialLocale}
            onChange={handleLocaleChange}
            options={localeOptions}
            placeholder={currentLabel}
            buttonClassName={investorsDropdownButtonClass}
            autoPosition={true}
            searchable={false}
            rightIcon={languageIcon}
            menuSelectedStyle="checkmark"
            menuExpandToContent
            dataTestId="investors-page-language"
          />
        </div>
      ) : null}
      <p className="text-base md:text-lg mb-10" style={SECONDARY_TEXT_STYLE}>
        {content.intro}
      </p>
      {SECTION_IDS.map((id, index) => {
        const block = content[id] as InvestorsBlock;
        return (
          <section key={id} className={index < SECTION_IDS.length - 1 ? 'surface mb-6' : 'surface'}>
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-primary-900">{block.title}</h2>
            {hasLead(block) ? (
              <p className="text-base md:text-lg mb-3 m-0" style={SECONDARY_TEXT_STYLE}>
                {block.lead}
              </p>
            ) : null}
            {block.paragraphs?.map((p, pIndex) => (
              <p
                key={pIndex}
                className="text-base md:text-lg mb-3 last:mb-0 m-0"
                style={SECONDARY_TEXT_STYLE}
              >
                {p}
              </p>
            ))}
            {block.items && block.items.length > 0 ? (
              <ul className="space-y-2 list-disc pl-5 m-0" style={SECONDARY_TEXT_STYLE}>
                {block.items.map((item, itemIndex) => (
                  <li
                    key={itemIndex}
                    className={
                      id === 'offer' && itemIndex === 0
                        ? 'text-base md:text-lg font-bold text-primary-900'
                        : 'text-base md:text-lg'
                    }
                  >
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
            {hasFooter(block) ? (
              <p className="text-base md:text-lg mt-4 mb-0 m-0" style={SECONDARY_TEXT_STYLE}>
                {block.footer}
              </p>
            ) : null}
          </section>
        );
      })}
      <div className="mt-[24px] pt-[24px] border-t border-primary-500/20 flex justify-center text-center">
        <Link
          href={href('/contacts')}
          className="inline-flex min-h-12 px-8 py-2 md:py-2.5 text-base rounded-lg font-medium transition-all duration-200 items-center justify-center gap-2 text-primary-700 hover-only:hover:text-primary-900 hover-only:hover:border-primary-900 active:text-primary-900 active:border-primary-900 border-2 border-primary-700 bg-primary-500/10 select-none"
        >
          {content.contactCta}
        </Link>
      </div>
    </div>
  );
}
