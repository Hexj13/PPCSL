'use client';

import { useI18n } from '@/components/I18nProvider';
import type { LegalDocument } from '@/lib/legal';
import { loadLegalConfigSync } from '@/lib/legal';
import { loadSiteConfigSync } from '@/lib/site-config';

const terms = {} as Record<string, LegalDocument>;

export default function TermsPage() {
  const { locale } = useI18n();
  const country = process.env.NEXT_PUBLIC_COUNTRY || 'md';
  const siteConfig = loadSiteConfigSync(country);
  const legalConfig = loadLegalConfigSync(country);
  const termsData = (legalConfig?.terms || terms) as Record<string, LegalDocument>;
  const languages = Object.keys(termsData);

  const language = languages.includes(locale) ? locale : languages[0] || 'en';
  const currentTerms = termsData[language] || termsData[languages[0]]!;

  const normalizeText = (text: string) => {
    return text
      .replaceAll('support@kupito.club', siteConfig.supportEmail)
      .replaceAll('https://kupito.club', siteConfig.siteUrl)
      .replaceAll('kupito.club', siteConfig.domain);
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold text-primary-700">
          {normalizeText(currentTerms.title)}
        </h1>
      </div>

      <p className="text-text-secondary mb-8 text-sm">{normalizeText(currentTerms.lastUpdated)}</p>

      <div className="surface mb-8">
        <h2 className="text-2xl font-bold mb-4 text-primary-500">
          {normalizeText(currentTerms.dictionary.title)}
        </h2>
        <div className="space-y-4">
          {currentTerms.dictionary.terms.map((item, index) => (
            <div key={index} className="border-b border-primary-500/10 pb-4 last:border-b-0">
              <h3 className="font-semibold text-primary-500 mb-1">{normalizeText(item.term)}</h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: 'rgb(var(--text-secondary-rgb))' }}
              >
                {normalizeText(item.definition)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="surface mb-8">
        <h2 className="text-2xl font-bold mb-4 text-primary-500">
          {normalizeText(currentTerms.toc.title)}
        </h2>
        <nav className="space-y-2">
          {currentTerms.toc.items.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className="block w-full text-left px-4 py-2 text-text-primary hover:text-primary-500 hover:bg-primary-500/10 rounded-lg transition-all duration-200"
            >
              {normalizeText(item.title)}
            </button>
          ))}
        </nav>
      </div>

      <div className="space-y-8">
        {currentTerms.sections.map((section) => (
          <section key={section.id} id={section.id} className="surface scroll-mt-20">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-primary-500">
              {normalizeText(section.title)}
            </h2>
            <div className="space-y-4">
              {section.content.map((paragraph, index) => (
                <p
                  key={index}
                  className="leading-relaxed text-base md:text-lg"
                  style={{ color: 'rgb(var(--text-secondary-rgb))' }}
                >
                  {normalizeText(paragraph)}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
