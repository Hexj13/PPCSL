'use client';

import { useState } from 'react';

import type { LegalDocument } from '@/lib/legal';
import { loadLegalConfigSync } from '@/lib/legal';
import { loadSiteConfigSync } from '@/lib/site-config';

type Language = string;

const privacy = {} as Record<string, LegalDocument>;

export default function PrivacyPage() {
  const country = process.env.NEXT_PUBLIC_COUNTRY || 'mk';
  const siteConfig = loadSiteConfigSync(country);
  const legalConfig = loadLegalConfigSync(country);
  const privacyData = (legalConfig?.privacy || privacy) as Record<string, LegalDocument>;
  const languages = Object.keys(privacyData);
  const defaultLanguage = siteConfig.locale.split('-')[0];

  const [language, setLanguage] = useState<Language>(() => {
    if (languages.includes(defaultLanguage)) {
      return defaultLanguage;
    }
    return languages[0] || 'en';
  });

  const currentPrivacy = privacyData[language] || privacyData[languages[0]]!;
  const currentDate = new Date().toLocaleDateString(language, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

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

  const toggleLanguage = () => {
    if (languages.length <= 1) {
      return;
    }
    const currentIndex = languages.indexOf(language);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % languages.length;
    setLanguage(languages[nextIndex]);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
          {normalizeText(currentPrivacy.title)}
        </h1>
        <button
          onClick={toggleLanguage}
          className="px-4 py-2 bg-bg-light border-2 border-primary-500/30 rounded-lg hover:bg-bg-light/80 hover:border-primary-500 transition-all duration-200 text-white font-medium"
        >
          {(
            languages[(languages.indexOf(language) + 1) % Math.max(languages.length, 1)] || language
          ).toUpperCase()}
        </button>
      </div>

      <p className="text-gray-400 mb-8 text-sm">
        {normalizeText(currentPrivacy.lastUpdated)}
        {currentDate}
      </p>

      <div className="surface mb-8">
        <h2 className="text-2xl font-bold mb-4">
          {normalizeText(currentPrivacy.dictionary.title)}
        </h2>
        <div className="space-y-4">
          {currentPrivacy.dictionary.terms.map((item, index) => (
            <div key={index} className="border-b border-primary-500/10 pb-4 last:border-b-0">
              <h3 className="font-semibold text-primary-300 mb-1">{normalizeText(item.term)}</h3>
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
        <h2 className="text-2xl font-bold mb-4">{normalizeText(currentPrivacy.toc.title)}</h2>
        <nav className="space-y-2">
          {currentPrivacy.toc.items.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className="block w-full text-left px-4 py-2 text-[rgb(243_243_243)] hover:!text-primary-400 hover:bg-primary-500/10 rounded-lg transition-all duration-200"
            >
              {normalizeText(item.title)}
            </button>
          ))}
        </nav>
      </div>

      <div className="space-y-8">
        {currentPrivacy.sections.map((section) => (
          <section key={section.id} id={section.id} className="surface scroll-mt-20">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">{normalizeText(section.title)}</h2>
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
