'use client';

import Link from 'next/link';

import { useI18n } from '@/components/providers/I18nProvider';
import { useTranslation } from '@/hooks/useTranslation';

type PartnerSection = {
  titleKey:
    | 'partners.howToBecome.title'
    | 'partners.benefits.title'
    | 'partners.whoCan.title'
    | 'partners.howToLeave.title'
    | 'partners.obligations.title';
  items: string[];
};

const SECONDARY_TEXT_STYLE = { color: 'rgb(var(--text-secondary-rgb))' } as const;

export default function PartnersPage() {
  const { t } = useTranslation();
  const { translations } = useI18n();
  if (!translations?.partners) {
    return null;
  }
  const { partners } = translations;
  const sections: PartnerSection[] = [
    { titleKey: 'partners.howToBecome.title', items: partners.howToBecome.items },
    { titleKey: 'partners.benefits.title', items: partners.benefits.items },
    { titleKey: 'partners.whoCan.title', items: partners.whoCan.items },
    { titleKey: 'partners.howToLeave.title', items: partners.howToLeave.items },
    { titleKey: 'partners.obligations.title', items: partners.obligations.items },
  ];

  return (
    <div className="max-w-4xl mx-auto pt-10 md:pt-14">
      <h1 className="text-4xl md:text-5xl font-extrabold mb-8 text-primary-900">
        {t('partners.title')}
      </h1>
      <p className="text-base md:text-lg mb-10" style={SECONDARY_TEXT_STYLE}>
        {t('partners.intro')}
      </p>
      {sections.map((section, sectionIndex) => (
        <section
          key={section.titleKey}
          className={sectionIndex < sections.length - 1 ? 'surface mb-6' : 'surface'}
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-primary-900">
            {t(section.titleKey)}
          </h2>
          <ul className="space-y-2 list-disc pl-5 m-0" style={SECONDARY_TEXT_STYLE}>
            {section.items.map((item, itemIndex) => (
              <li key={itemIndex} className="text-base md:text-lg">
                {item}
              </li>
            ))}
          </ul>
        </section>
      ))}
      <div className="mt-[24px] pt-[24px] border-t border-primary-500/20 flex justify-center text-center">
        <Link
          href="/contacts"
          className="inline-flex min-h-12 px-8 py-2 md:py-2.5 text-base rounded-lg font-medium transition-all duration-200 items-center justify-center gap-2 text-primary-700 hover-only:hover:text-primary-900 hover-only:hover:border-primary-900 active:text-primary-900 active:border-primary-900 border-2 border-primary-700 bg-primary-500/10 select-none"
        >
          {t('partners.contactCta')}
        </Link>
      </div>
    </div>
  );
}
