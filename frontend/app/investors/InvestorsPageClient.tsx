'use client';

import Link from 'next/link';
import { useCallback, useMemo, useRef, useState } from 'react';

import { Dropdown } from '@/components/common/Dropdown';
import type { Translations } from '@/lib/i18n-types';

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

type InvestorsPageLocale = 'en' | 'ro' | 'ru';

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

const LOCALE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'ro', label: 'Română' },
  { value: 'ru', label: 'Русский' },
];

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

export function InvestorsPageClient({ initialInvestors }: { initialInvestors: InvestorsBundle }) {
  const cache = useRef<Map<InvestorsPageLocale, InvestorsBundle>>(
    new Map([['en', initialInvestors]]),
  );
  const [locale, setLocale] = useState<InvestorsPageLocale>('en');
  const [content, setContent] = useState<InvestorsBundle>(initialInvestors);
  const [isLoadingLocale, setIsLoadingLocale] = useState(false);

  const currentLabel = useMemo(
    () => LOCALE_OPTIONS.find((o) => o.value === locale)?.label ?? 'English',
    [locale],
  );

  const handleLocaleChange = useCallback(
    (value: string) => {
      if (value !== 'en' && value !== 'ro' && value !== 'ru') {
        return;
      }
      const next: InvestorsPageLocale = value;
      if (next === locale || isLoadingLocale) {
        return;
      }
      const hit = cache.current.get(next);
      if (hit) {
        setLocale(next);
        setContent(hit);
        return;
      }
      setIsLoadingLocale(true);
      void import(`@/lib/locales/${next}.json`)
        .then((mod: { default: Translations }) => {
          const inv = mod.default.investors;
          if (!inv) {
            return;
          }
          cache.current.set(next, inv);
          setLocale(next);
          setContent(inv);
        })
        .catch(() => {
          // Silently ignore locale load failure; UI stays on the current locale.
        })
        .finally(() => {
          setIsLoadingLocale(false);
        });
    },
    [locale, isLoadingLocale],
  );

  return (
    <div className="max-w-4xl mx-auto pt-10 md:pt-14">
      <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-primary-900">{content.title}</h1>
      <div className="mb-8 inline-flex max-w-full">
        <Dropdown
          className="w-fit"
          value={locale}
          onChange={handleLocaleChange}
          options={LOCALE_OPTIONS}
          placeholder={currentLabel}
          buttonClassName={investorsDropdownButtonClass}
          autoPosition={true}
          searchable={false}
          rightIcon={languageIcon}
          menuSelectedStyle="checkmark"
          menuExpandToContent
          disabled={isLoadingLocale}
          dataTestId="investors-page-language"
        />
      </div>
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
          href="/contacts"
          className="inline-flex min-h-12 px-8 py-2 md:py-2.5 text-base rounded-lg font-medium transition-all duration-200 items-center justify-center gap-2 text-primary-700 hover-only:hover:text-primary-900 hover-only:hover:border-primary-900 active:text-primary-900 active:border-primary-900 border-2 border-primary-700 bg-primary-500/10 select-none"
        >
          {content.contactCta}
        </Link>
      </div>
    </div>
  );
}
