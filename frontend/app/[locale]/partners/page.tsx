'use client';

import Link from 'next/link';

import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import { useTranslation } from '@/hooks/useTranslation';

type PartnerSectionKey = 'whoCan' | 'benefits' | 'howToBecome' | 'howToLeave' | 'obligations';

const partnerSectionKeys: PartnerSectionKey[] = [
  'whoCan',
  'benefits',
  'howToBecome',
  'howToLeave',
  'obligations',
];

export default function PartnersPage() {
  const { translations } = useTranslation();
  const { href } = useLocalizedNavigation();

  return (
    <div className="mx-auto max-w-4xl pt-4 md:pt-6">
      <h1 className="mb-6 text-4xl font-extrabold text-primary-900 md:text-5xl">
        {translations.partners.title}
      </h1>
      <p
        className="mb-10 text-base leading-relaxed md:text-lg"
        style={{ color: 'rgb(var(--text-secondary-rgb))' }}
      >
        {translations.partners.intro}
      </p>

      <div className="space-y-6">
        {partnerSectionKeys.map((sectionKey) => {
          const section = translations.partners[sectionKey];

          return (
            <section key={sectionKey} className="surface">
              <h2 className="mb-4 text-2xl font-bold text-primary-900 md:text-3xl">
                {section.title}
              </h2>
              <ul className="space-y-3">
                {section.items.map((item, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary-500" />
                    <span
                      className="text-base leading-relaxed md:text-lg"
                      style={{ color: 'rgb(var(--text-secondary-rgb))' }}
                    >
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <div className="mt-[24px] pt-[24px] border-t border-primary-500/20 flex justify-center text-center">
        <Link
          href={href('/contacts')}
          className="inline-flex min-h-12 px-8 py-2 md:py-2.5 text-base rounded-lg font-medium transition-all duration-200 items-center justify-center gap-2 text-primary-700 hover-only:hover:text-primary-900 hover-only:hover:border-primary-900 active:text-primary-900 active:border-primary-900 border-2 border-primary-700 bg-primary-500/10 select-none"
        >
          {translations.partners.contactCta}
        </Link>
      </div>
    </div>
  );
}
