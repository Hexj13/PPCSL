'use client';

import { useI18n } from '@/components/providers/I18nProvider';
import type { LegalDocument } from '@/lib/content/legal';
import { loadLegalConfigSync } from '@/lib/content/legal';
import { loadSiteConfigSync } from '@/lib/site-config';
import { getCountry } from '@/lib/utils';

const privacy = {} as Record<string, LegalDocument>;

export default function PrivacyPage() {
  const { locale } = useI18n();
  const country = getCountry();
  const siteConfig = loadSiteConfigSync(country);
  const legalConfig = loadLegalConfigSync(country);
  const privacyData = (legalConfig?.privacy || privacy) as Record<string, LegalDocument>;
  const languages = Object.keys(privacyData);

  const language = languages.includes(locale) ? locale : languages[0] || 'en';
  const currentPrivacy = privacyData[language] || privacyData[languages[0]]!;

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
    <div className="max-w-4xl mx-auto pt-10 md:pt-14">
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold text-primary-700">
          {normalizeText(currentPrivacy.title)}
        </h1>
      </div>

      <p className="text-text-secondary mb-8 text-sm">
        {normalizeText(currentPrivacy.lastUpdated)}
      </p>

      <div className="surface mb-8">
        <h2 className="text-2xl font-bold mb-4 text-primary-500">
          {normalizeText(currentPrivacy.dictionary.title)}
        </h2>
        <div className="space-y-4">
          {currentPrivacy.dictionary.terms.map((item, index) => (
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
          {normalizeText(currentPrivacy.toc.title)}
        </h2>
        <nav className="space-y-2">
          {currentPrivacy.toc.items.map((item) => (
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
        {currentPrivacy.sections.map((section) => (
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
