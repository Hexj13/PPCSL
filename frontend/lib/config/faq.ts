import { faqEn } from './faq-data-en';
import { faqRo } from './faq-data-ro';
import { faqRu } from './faq-data-ru';
import type { FAQConfigWithLanguages } from './faq-types';

export * from './faq-types';

const faqConfig: FAQConfigWithLanguages = {
  ro: faqRo,
  ru: faqRu,
  en: faqEn,
};

export default faqConfig;
