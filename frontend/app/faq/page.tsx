'use client';

import { useState } from 'react';

import { useI18n } from '@/components/providers/I18nProvider';
import { useTranslation } from '@/hooks/useTranslation';
import { loadFaqSync } from '@/lib/content/faq';
import { loadSiteConfigSync } from '@/lib/site-config';
import { getCountry } from '@/lib/utils';

export default function FAQPage() {
  const { t } = useTranslation();
  const { locale } = useI18n();
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const country = getCountry();
  const siteConfig = loadSiteConfigSync(country);
  const faqConfig = loadFaqSync(country, locale);
  const faqItems = faqConfig?.items || [];
  const userScenarios = faqConfig?.scenarios || [];

  const toggleItem = (id: string) => {
    setOpenItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const normalizeText = (text: string) => {
    return text
      .replaceAll('support@kupito.club', siteConfig.supportEmail)
      .replaceAll('kupito.club', siteConfig.domain);
  };

  return (
    <div className="max-w-4xl mx-auto pt-10 md:pt-14">
      <h1 className="text-4xl md:text-5xl font-extrabold mb-8 text-primary-900">
        {t('faq.title')}
      </h1>

      <div className="space-y-4 mb-12">
        {faqItems.map((item) => {
          const isOpen = openItems.has(item.id);
          const answerContent = Array.isArray(item.answer) ? item.answer : [item.answer];

          return (
            <div key={item.id} className="surface">
              <button
                onClick={() => toggleItem(item.id)}
                className="w-full text-left flex justify-between items-center p-4 hover-only:hover:bg-primary-500/10 transition-colors duration-200 rounded-lg"
              >
                <h2 className="text-lg md:text-xl font-semibold text-primary-900 pr-4">
                  {normalizeText(item.question)}
                </h2>
                <span className="text-primary-400 text-2xl font-bold shrink-0">
                  {isOpen ? '−' : '+'}
                </span>
              </button>
              {isOpen && (
                <div className="px-4 pb-4">
                  <div
                    className="space-y-2 leading-relaxed"
                    style={{ color: 'rgb(var(--text-secondary-rgb))' }}
                  >
                    {answerContent.map((paragraph, index) => (
                      <p key={index} className="text-base md:text-lg">
                        {normalizeText(paragraph)}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="surface mt-12">
        <h2 className="text-2xl md:text-3xl font-bold mb-6 text-primary-900">
          {t('faq.userScenarios.title')}
        </h2>
        <p
          className="mb-6 text-base md:text-lg"
          style={{ color: 'rgb(var(--text-secondary-rgb))' }}
        >
          {t('faq.userScenarios.description')}
        </p>
        <div className="space-y-6">
          {userScenarios.map((scenario) => (
            <div key={scenario.id} className="border-l-4 border-primary-500 pl-4">
              <h3 className="text-xl font-semibold text-primary-700 mb-3">
                {normalizeText(scenario.title)}
              </h3>
              <ol className="space-y-2" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
                {scenario.steps.map((step, index) => (
                  <li key={index} className="flex items-start">
                    <span className="font-bold text-primary-400 mr-2 shrink-0">{index + 1}.</span>
                    <span className="text-base md:text-lg">{normalizeText(step)}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-12 pt-8 border-t border-primary-500/20 text-center text-gray-400 text-sm">
        <p>
          {t('faq.contact.description')}{' '}
          <a
            href={`mailto:${siteConfig.supportEmail}`}
            className="text-primary-400 hover-only:hover:text-primary-300 underline"
          >
            {siteConfig.supportEmail}
          </a>
        </p>
      </div>
    </div>
  );
}
