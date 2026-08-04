import { faqEn } from './faq-data-en';
import { faqSq } from './faq-data-sq';
import type { FAQConfigWithLanguages } from './faq-types';

export * from './faq-types';

const faqConfig: FAQConfigWithLanguages = {
  sq: faqSq,
  en: faqEn,
};

export default faqConfig;
